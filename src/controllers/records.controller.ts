import * as express from "express";
import {
  controller,
  httpDelete,
  httpGet,
  request,
  response,
} from "inversify-express-utils";
import { Cooker, CookerOptionsInvalidError } from "../pkg/cooker/cook";
import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../constants";
import { StatusCodes } from "http-status-codes";

@controller("/")
export class RecordsController {
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

    const id = Number(req.params.id);
    if (isNaN(id) || !Cooker.recordExists(id)) {
      res.status(404);
      res.end(`Record ${req.params.id} doesn't exists !`);
      return;
    }
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

    console.log(`container: ${container}, format: ${format}, id: ${id}`);
    const options = {
      format: format as ALLOWED_FORMATS,
      container: container as ALLOWED_CONTAINERS,
      dynaudnorm: false,
    };
    try {
      const meta = Cooker.getFileMetadataFor(options);
      res.setHeader("content-type", meta.mime);
      res.setHeader(
        "content-disposition",
        `attachment; filename=${id}${meta.extension}`
      );
      // Workaround for https://github.com/inversify/InversifyJS/issues/850
      return () => Cooker.cook(id, options).pipe(res);
    } catch (e) {
      if (e instanceof CookerOptionsInvalidError) {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY);
        res.end(e.message);
        return;
      }
      console.error(e);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR);
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
  delete(@request() req: express.Request, @response() res: express.Response) {
    const id = Number(req.params.id);
    if (isNaN(id) || !Cooker.recordExists(id)) {
      res.status(404);
      res.end(`Record ${req.params.id} doesn't exists !`);
      return;
    }
    try {
      const hasBeenDeleted = Cooker.delete(id);
      if (!hasBeenDeleted) {
        res.status(401);
        res.end("Cannot delete a recording while it's been downloaded.");
      }
    } catch (e) {
      console.error(e);
      res.status(500);
      res.end("Could not delete recording wth id : " + id);
    }
    res.status(200);
  }
}
