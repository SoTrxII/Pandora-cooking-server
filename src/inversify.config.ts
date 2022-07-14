/** Object Store */
import {
  IObjectStore,
  IObjectStoreProxy,
} from "./pkg/object-store/objet-store-api";
import { DaprObjectStorageAdapter } from "./pkg/object-store/dapr-object-storage-adapter";
import { Container } from "inversify";
import { DaprClient } from "@dapr/dapr";
import { TYPES } from "./types";
import { ExternalObjectStore } from "./pkg/object-store/external-objet-store";
import { ecsLogger } from "./pkg/logger/logger-ecs";
import { plainTextLogger } from "./pkg/logger/logger-plain-text";
import { ILogger } from "./pkg/logger/logger-api";
import { ICooking } from "./pkg/cooker/cook-api";
import { Cooker } from "./pkg/cooker/cook";
import { IRecordsService } from "./services/records/records.service.api";
import { RecordsService } from "./services/records/records.service";
import { join } from "path";

export const container = new Container();

const objComponent = process.env?.OBJECT_STORE_NAME;
// Only register the Object Store component of the Dapr component name was supplied
if (objComponent) {
  container
    .bind<IObjectStoreProxy>(TYPES.ObjectStoreProxy)
    .toConstantValue(
      new DaprObjectStorageAdapter(
        new DaprClient().binding,
        process.env.OBJECT_STORE_NAME
      )
    );
  container.bind<IObjectStore>(TYPES.ObjectStore).to(ExternalObjectStore);
}

/**
 * Logger
 * Using ECS format in production to allows for an ELK stack to parse them
 * Using plain text in dev to still have a human-readable format
 */
const logger =
  process.env.NODE_ENV === "production" ? ecsLogger : plainTextLogger;
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);

/**
 * Cooking, handle record and calls to the cooking script
 */
container
  .bind<ICooking>(TYPES.Cooking)
  .toConstantValue(new Cooker(join(__dirname, "rec"), __dirname));

/**
 * Services
 */
container.bind<IRecordsService>(TYPES.ServiceRecords).to(RecordsService);
