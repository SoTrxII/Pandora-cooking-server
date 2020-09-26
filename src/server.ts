import * as express from "express";
import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "./constants";
import { Cooker } from "./cook";

const app = express();
const PORT = 3004;

app.get("/:id", (req, res) => {
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

  try {
    Cooker.cook(id, {
      format: format as ALLOWED_FORMATS,
      container: container as ALLOWED_CONTAINERS,
      dynaudnorm: false,
    }).pipe(res);
  } catch (e) {
    console.error(e);
    res.attachment(`audio`);
    res.status(500);
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
    Cooker.delete(id);
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
