import * as express from "express";
import {
  controller,
  httpDelete,
  httpGet,
  interfaces,
  request,
  response,
} from "inversify-express-utils";
import { Cooker, CookerOptionsInvalidError } from "../pkg/cooker/cook";
import { StatusCodes } from "http-status-codes";
import { inject } from "inversify";
import { TYPES } from "../types";
import { IRecordsService } from "../services/records/records.service.api";
import { ILogger } from "../pkg/logger/logger-api";
import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../pkg/cooker/cook-api";

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
   *          description: >
   *             File container:
   *              * `mix` - One audio file for the whole recording
   *              * `zip` - One audio file per user in a zip file
   *              * `ogg` - Multi-channels .ogg file
   *              * `matroska` - Multi-channels .mka file
   *              * `aupzip` - one audio file par user in a zipped Audacity project
   *        - name: format
   *          in: query
   *          required: false
   *          schema:
   *            type: string
   *            enum: [copy, oggflac, vorbis, aac, heaac, flac, opus, wav, adpcm, wav8, mp3, ra]
   *            default: opus
   *          description: >
   *             Audio codec/extension wanted:
   *              * `copy` - Copy the raw ogg streams for each user. This option isn't compatible with the mix container.
   *              * `oggflac`
   *              * `aac`
   *              * `heaac` - Be careful, this one is platform-dependant.
   *              * `vorbis`
   *              * `flac`
   *              * `opus`
   *              * `wav`
   *              * `adpcm`
   *              * `wav8`
   *              * `mp3`
   *              * `ra`
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
      const meta = this.recordsService.getMetadata(options);
      res.setHeader("content-type", meta.mime);
      res.setHeader(
        "content-disposition",
        `attachment; filename=${id}${meta.extension}`
      );
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
}
