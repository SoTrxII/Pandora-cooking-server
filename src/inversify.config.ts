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
