import * as express from "express";
import {
  controller,
  httpDelete,
  httpGet,
  httpPost,
  interfaces,
  request,
  requestBody,
  response,
} from "inversify-express-utils";
import { CookerOptionsInvalidError } from "../pkg/cooker/cook";
import { StatusCodes } from "http-status-codes";
import { inject } from "inversify";
import { TYPES } from "../types";
import { IRecordsService } from "../services/records/records.service.api";
import { ILogger } from "../pkg/logger/logger-api";
import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  IRecordMetadata,
} from "../pkg/cooker/cook-api";
import { Readable } from "stream";

enum DAPR_RESPONSE {
  OK = "SUCCESS",
  NO_RETRY = "DROP",
  RETRY = "RETRY",
}

/**
 * @openapi
 *     components:
 *       desc:
 *         container: |
 *          File container:
 *          * `mix` - One audio file for the whole recording
 *          * `zip` - One audio file per user in a zip file
 *          * `ogg` - Multi-channels .ogg file
 *          * `matroska` - Multi-channels .mka file
 *          * `aupzip` - one audio file par user in a zipped Audacity project
 *         format: |
 *           Audio codec/extension wanted:
 *           * `copy` - Copy the raw ogg streams for each user. This option isn't compatible with the mix container.
 *           * `oggflac`
 *           * `aac`
 *           * `heaac` - Be careful, this one is platform-dependant.
 *           * `vorbis`
 *           * `flac`
 *           * `opus`
 *           * `wav`
 *           * `adpcm`
 *           * `wav8`
 *           * `mp3`
 *           * `ra`
 */
@controller("/")
export class RecordsController implements interfaces.Controller {
  constructor(
    @inject(TYPES.ServiceRecords) private recordsService: IRecordsService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  /**
   * @openapi
   *
   * /{id}:
   *   get:
   *      description: Retrieve audio from an existing record
   *      responses:
   *       200:
   *         description: Returns audio
   *         content:
   *          audio/*:
   *            schema:
   *              type: string
   *              format: binary
   *          application/octet-stream:
   *            schema:
   *              type: string
   *              format: binary
   *          application/zip:
   *            schema:
   *              type: string
   *              format: binary
   *       404:
   *         description: Audio not found
   *       422:
   *         description: The provided container/format aren't compatible with each other
   *       500:
   *         description: Something went wrong
   *      parameters:
   *        - name: id
   *          in: path
   *          description: Record ID
   *          required: true
   *          schema:
   *            type: integer
   *            format: int32
   *        - name: container
   *          in: query
   *          required: false
   *          schema:
   *            type: string
   *            enum: [mix, aupzip, zip, matroska, ogg]
   *            default: mix
   *          description:
   *            $ref: '#/components/desc/container'
   *        - name: format
   *          in: query
   *          required: false
   *          schema:
   *            type: string
   *            enum: [copy, oggflac, vorbis, aac, heaac, flac, opus, wav, adpcm, wav8, mp3, ra]
   *            default: opus
   *          description:
   *            $ref: '#/components/desc/format'
   */
  @httpGet(":id")
  async get(
    @request() req: express.Request,
    @response() res: express.Response
  ) {
    // Disable request time out because cook.sh can take a long time
    req.setTimeout(0);
    this.logger.info(`New incoming request with param id "${req.params.id}"`);

    // Path check : ID must be defined and have a corresponding record
    const id = Number(req.params.id);
    if (isNaN(id) || !(await this.recordsService.exists(id))) {
      res.status(StatusCodes.NOT_FOUND);
      this.logger.info(
        `Request for record with id "${req.params.id}" was denied : No such record`
      );
      res.end(`Record ${req.params.id} doesn't exists !`);
      return;
    }

    // Optional args check : container and format
    // All containers and format aren't compatible with each other
    // but it would be overkill to check that too
    // If not defined, fallback to a mixed opus single track
    let container = req.query.container ?? ALLOWED_CONTAINERS.MIX;
    let format = req.query.format ?? ALLOWED_FORMATS.OPUS;

    const containers = Object.values(ALLOWED_CONTAINERS) as string[];
    if (!containers.includes(container.toString())) {
      container = ALLOWED_CONTAINERS.MIX;
    }

    const formats = Object.values(ALLOWED_FORMATS) as string[];
    if (!formats.includes(format.toString())) {
      format = ALLOWED_FORMATS.OPUS;
    }

    this.logger.debug(`container: ${container}, format: ${format}, id: ${id}`);

    // Stream back the record as an audio file.
    // We can try and guess the mime with the chosen format and container
    const options = {
      format: format as ALLOWED_FORMATS,
      container: container as ALLOWED_CONTAINERS,
      dynaudnorm: false,
    };
    try {
      const fileMetadata = this.recordsService.getMetadata(options);
      res.setHeader("content-type", fileMetadata.mime);
      // <UTC_timestamp>-<channel_name>-<id>.<container_extension>
      let recordMetadata: Partial<IRecordMetadata>;
      try {
        recordMetadata = await this.recordsService.getRecordMetadata(id);
      } catch (e) {
        this.logger.warn(`Could not retrieve metadata for record ${id}`, e);
      }
      const name = this.formatFileName(
        id,
        fileMetadata.extension,
        recordMetadata
      );
      res.setHeader("content-disposition", `attachment; filename=${name}`);
      // Workaround for https://github.com/inversify/InversifyJS/issues/850a
      const stream = await this.recordsService.stream(id, options);
      return () => stream.pipe(res);
    } catch (e) {
      // Format and container aren't compatible
      if (e instanceof CookerOptionsInvalidError) {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY);
        this.logger.warn(`Aborting record handling, invalid set of options`, {
          err: e,
        });
        res.end(e.message);
        return;
      }
      // Cooking script errored in some way
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      this.logger.error(`Fatal error occurred. Error: `, { err: e });
      res.end("Error while cooking recording with id: " + id);
    }
  }

  @httpPost("")
  /**
   * @openapi
   *
   * /:
   *   post:
   *      description: Process one or more records asynchronously. Records will be either store on local FS or object storage if provided
   *      responses:
   *       202:
   *         description: Transcoding job has been accepted
   *       404:
   *         description: Record not found
   *       422:
   *         description: The provided container/format aren't compatible with each other
   *       500:
   *         description: Something went wrong
   *      requestBody:
   *        required: true
   *        content:
   *          application/json:
   *            schema:
   *              oneOf:
   *                - type: object
   *                  properties:
   *                    ids:
   *                     type: array
   *                     items:
   *                      type: integer
   *                    container:
   *                      type: string
   *                      enum: [mix, aupzip, zip, matroska, ogg]
   *                      default: mix
   *                      description:
   *                        $ref: '#/components/desc/container'
   *                    format:
   *                      type: string
   *                      enum: [copy, oggflac, vorbis, aac, heaac, flac, opus, wav, adpcm, wav8, mp3, ra]
   *                      default: opus
   *                      description:
   *                        $ref: '#/components/desc/format'
   *                  required:
   *                    - ids
   *                - type: object
   *                  properties:
   *                    ids:
   *                      type: integer
   *                      format: int32
   *                    container:
   *                      type: string
   *                      enum: [mix, aupzip, zip, matroska, ogg]
   *                      default: mix
   *                      description:
   *                        $ref: '#/components/desc/container'
   *                    format:
   *                      type: string
   *                      enum: [copy, oggflac, vorbis, aac, heaac, flac, opus, wav, adpcm, wav8, mp3, ra]
   *                      default: opus
   *                      description:
   *                        $ref: '#/components/desc/format'
   *                  required:
   *                    - id
   */
  async processAsync(
    @request() req: express.Request,
    @requestBody() body: Record<string, any>,
    @response() res: express.Response
  ) {
    // Async processing, we just have to verify parameters and accept the job
    // Disable request time out because cook.sh can take a long time
    req.setTimeout(0);

    if (body === undefined) {
      res.status(StatusCodes.NOT_FOUND);
      res.end(
        JSON.stringify({
          message: "Invalid request, body empty !",
          status: DAPR_RESPONSE.NO_RETRY,
        })
      );
      return;
    }
    // Also parse Dapr cloudevent format
    if (body.data !== undefined && body.type === "com.dapr.event.sent") {
      body = body.data;
    }

    // Collect record ID(s) to process
    let ids: string[] = [];
    // ID is a string
    if (body?.id !== undefined) ids.push(body.id);
    // IDs is an array of string. If both are provided, "ids" takes precedence
    if (body?.ids !== undefined) ids = body.ids;

    if (ids.length === 0) {
      res.status(StatusCodes.NOT_FOUND);
      res.end(
        JSON.stringify({
          message: "No record IDs specified",
          status: DAPR_RESPONSE.NO_RETRY,
        })
      );
      return;
    }
    // Finally, ensure each record id is unique
    ids = [...new Set(ids)];
    this.logger.info(`New incoming async request with param id "${ids}"`);

    // Optionnaly, the record can have a jobId, this is the ID for the batch
    // of records, and will just be echoed
    const jobId: string = body.jobId;

    // Once we've gotten all the record ids to process, ensure each one actually exists
    // to fail fast
    const recordExists = await Promise.all(
      ids.map(
        async (rid) =>
          !isNaN(Number(rid)) && (await this.recordsService.exists(Number(rid)))
      )
    );
    // If any record doesn't exist, abort
    if (recordExists.some((exists) => exists === false)) {
      const invalidIDs = ids
        .filter((_id, index) => recordExists[index] === false)
        .join(",");
      res.status(StatusCodes.NOT_FOUND);
      this.logger.info(
        `Request for record(s) with id(s) [${ids.join(
          ","
        )}] was denied : Some records ([${invalidIDs}]) don't exists`
      );
      res.end(
        JSON.stringify({
          message: `Some of the provided record(s) (${invalidIDs}) don't exist !`,
          status: DAPR_RESPONSE.NO_RETRY,
        })
      );
      return;
    }

    // Optional args check : container and format
    // All containers and format aren't compatible with each other
    // but it would be overkill to check that too
    // If not defined, fallback to a mixed opus single track
    let container = body.container ?? ALLOWED_CONTAINERS.MIX;
    let format = body.format ?? ALLOWED_FORMATS.OPUS;

    const containers = Object.values(ALLOWED_CONTAINERS) as string[];
    if (!containers.includes(container.toString())) {
      container = ALLOWED_CONTAINERS.MIX;
    }

    const formats = Object.values(ALLOWED_FORMATS) as string[];
    if (!formats.includes(format.toString())) {
      format = ALLOWED_FORMATS.OPUS;
    }

    this.logger.debug(
      `container: ${container}, format: ${format}, ids: ${ids.join(",")}`
    );

    // Convert all the records as an audio files, and store them directly on the object storage
    // NOTE: As Dapr doesn't yet support streaming upload, we have to first convert all the records on the filesystem
    const options = {
      format: format as ALLOWED_FORMATS,
      container: container as ALLOWED_CONTAINERS,
      dynaudnorm: false,
    };
    // Open all audio streams, if any fails abort
    const streams = await Promise.allSettled(
      ids.map(
        async (id) => await this.recordsService.stream(Number(id), options)
      )
    );
    if (streams.some((s) => s.status === "rejected")) {
      const errors = streams
        .filter((s) => s.status === "rejected")
        .map((rej: PromiseRejectedResult) => rej.reason);

      // All streams have been converted the same way, we can take on the rejection
      // and generalize the result

      const exampleError = errors[0];
      // Format and container aren't compatible
      if (exampleError instanceof CookerOptionsInvalidError) {
        res.status(StatusCodes.NOT_FOUND);
        this.logger.warn(`Aborting record handling, invalid set of options`, {
          err: exampleError,
        });
        res.end(
          JSON.stringify({
            message: exampleError.message,
            status: DAPR_RESPONSE.NO_RETRY,
          })
        );
        return;
      }
      // Cooking script errored in some way
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      this.logger.error(`Fatal error occurred. Error: `, { err: exampleError });
      res.end(
        JSON.stringify({
          message: "Error while cooking recording with ids: " + ids.join(","),
          status: DAPR_RESPONSE.NO_RETRY,
        })
      );
      return;
    }

    // Past this point, all streams have opened successfully, we can accept the job
    res.status(StatusCodes.ACCEPTED);
    res.end(
      JSON.stringify({
        message: `OK`,
        status: DAPR_RESPONSE.OK,
      })
    );

    streams
      // all streams are valid past this point, we can directly get their value
      .map((s: PromiseFulfilledResult<Readable>) => s.value)
      // Process all streams concurrently as async jobs, the controller
      // has no reason to supervise this
      .forEach((stream, index) =>
        this.recordsService
          .startAsyncTranscodingJob(stream, ids.at(index), options, { jobId })
          .catch((e) => this.logger.error(e))
      );
  }

  /**
   * @openapi
   *
   * /{id}:
   *   delete:
   *      description: Delete all files from a recording
   *      responses:
   *       204:
   *         description: File successfully deleted
   *       401:
   *         description: This record is currently being downloaded and can't be deleted
   *       500:
   *         description: Something went wrong
   *      parameters:
   *        - name: id
   *          in: path
   *          description: Record ID
   *          required: true
   *          schema:
   *            type: integer
   *            format: int32
   */
  @httpDelete(":id")
  async delete(
    @request() req: express.Request,
    @response() res: express.Response
  ) {
    this.logger.info(
      `Incoming request to delete record with ID ${req.params.id}`
    );
    // Path check, id must be defined
    const id = Number(req.params.id);
    if (isNaN(id) || !(await this.recordsService.exists(id))) {
      res.status(StatusCodes.NOT_FOUND);
      this.logger.info(
        `Deletion request for record with ID ${req.params.id} was denied : No such record`
      );
      res.end(`Record ${req.params.id} doesn't exists !`);
      return;
    }

    // We cannot allow deletion if a record is being processed
    // Although it shouldn't be a problem on Linux, it may be cooking
    try {
      const hasBeenDeleted = await this.recordsService.delete(id);
      if (!hasBeenDeleted) {
        res.status(StatusCodes.FORBIDDEN);
        this.logger.info(
          `Deletion request for record with ID ${req.params.id} was denied : Record still being downloaded`
        );
        res.end("Cannot delete a recording while it's been downloaded.");
        return;
      }
    } catch (e) {
      this.logger.error(
        `Unexpected error for deletion request of record with id ${req.params.id}`,
        { err: e }
      );
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      res.end("Could not delete recording wth id : " + id);
      return;
    }
    res.status(StatusCodes.OK);
  }

  /**
   * Return file naming convention, depending on the amount of info retrieved
   * @param id
   * @param ext
   * @param info
   */
  formatFileName(
    id: number,
    ext: string,
    info?: Partial<IRecordMetadata>
  ): string {
    const MAX_FILE_NAME_LENGTH = 255;
    // First, we try to get the idela naming convention, but it depends on record
    // metadata
    // <UTC_timestamp>-<channel_name>-<id>.<container_extension>
    let channelName = info?.channel;
    let started = info?.startTime;
    let name: string;
    if (started !== undefined && channelName !== undefined) {
      // Check for Pandora v1 naming
      // If the channel name is something like name#id, remove the ID
      const oldChannelNamingRegex = /(.*)#\d+$/;
      if (oldChannelNamingRegex.test(channelName))
        channelName = channelName.match(oldChannelNamingRegex)[1];
      // Likewise, if the startDate is not a timestamp, this is probably an old UTC string
      if (isNaN(Number(started))) started = String(new Date(started).getTime());

      name = `${started}-${channelName}-${id}${ext}`;
      // If the name is too long to be a filename, cut the channel name
      if (name.length > MAX_FILE_NAME_LENGTH) {
        const withoutChannelNameTotal =
          started.length + String(id).length + ext.length;
        // Making sure we're under the name limit
        const OFFSET = 10;
        const channelNameLength =
          MAX_FILE_NAME_LENGTH - withoutChannelNameTotal - OFFSET;
        const truncatedChannelNAme = channelName.substring(
          0,
          channelNameLength
        );
        name = `${started}-${truncatedChannelNAme}-${id}${ext}`;
      }
    } else {
      // Falling back to <id>.<container_extension>
      name = `${id}${ext}`;
    }

    // All illegal characters is a filename
    const illegalRe = /[\/\?<>\\:\*\|"]/g;
    // All control characters for a terminal
    const controlRe = /[\x00-\x1f\x80-\x9f]/g;
    // Forbidden trailing characters for windows
    const windowsTrailingRe = /[\. ]+$/;
    // Return a sanitized name
    return name
      .replace(illegalRe, "")
      .replace(controlRe, "")
      .replace(windowsTrailingRe, "");
  }
}
