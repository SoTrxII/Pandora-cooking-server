import "reflect-metadata";
import "./controllers/records.controller";

import { container } from "./inversify.config";
import { InversifyExpressServer } from "inversify-express-utils";
const server = new InversifyExpressServer(container);
const app = server.build();
const PORT = 3004;
app.listen(PORT, () => {
  console.log(`⚡️[server]: Server is running at port ${PORT}`);
});
