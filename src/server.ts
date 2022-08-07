import "reflect-metadata";
import "./controllers/records.controller";
import { json } from "express";
import { container } from "./inversify.config";
import { InversifyExpressServer } from "inversify-express-utils";
import { ILogger } from "./pkg/logger/logger-api";
import { TYPES } from "./types";

const server = new InversifyExpressServer(container);
const app = server.build();

// Allow the server to parse JSON body
server.setConfig((app) => app.use(json()));
const PORT = 3004;
app.listen(PORT, () => {
  const logger = container.get<ILogger>(TYPES.Logger);
  logger.info(`⚡️[server]: Server is running at port ${PORT}`);
});
