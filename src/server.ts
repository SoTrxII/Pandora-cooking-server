import * as express from "express";
import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "./constants";
import { Cooker, CookerOptionsInvalidError } from "./cook";
import { StatusCodes } from "http-status-codes";

const app = express();
const PORT = 3004;

app.get("/:id", (req, res) => {
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

  const containers = Object.values(ALLOWED_CONTAINERS) as String[];
  if (!containers.includes(container.toString())) {
    container = ALLOWED_CONTAINERS.MIX;
  }

  const formats = Object.values(ALLOWED_FORMATS) as String[];
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
    Cooker.cook(id, options).pipe(res);
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
});

app.delete("/:id", (req, res) => {
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
});

app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at port ${PORT}`);
});
