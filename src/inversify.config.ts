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
import IClientPubSub from "@dapr/dapr/interfaces/Client/IClientPubSub";
import { DaprMessageBroker } from "./internal/message-broker/dapr-message-broker";
import { IMessageBroker } from "./internal/message-broker/message-broker-api";
import { IJobNotifier } from "./pkg/job-notifier/job-notifier.api";
import { JobNotifier } from "./pkg/job-notifier/job-notifier";

export const container = new Container();

/**
 * Logger
 * Using ECS format in production to allows for an ELK stack to parse them
 * Using plain text in dev to still have a human-readable format
 */
const logger =
  process.env.NODE_ENV === "production" ? ecsLogger : plainTextLogger;
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);

/**
 * Setup Object storage. (Optionnal)
 * If defined, the record will also be uploaded on a remote storage when done
 */
const objComponent = process.env?.OBJECT_STORE_NAME;

if (objComponent) {
  logger.info(`Using Remote Object storage "${objComponent}" !`);
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

/** Message broker
 * This is an optional feature, allowing the cooking server to send progress/done
 * message when a recording is asynchronously transcoded
 * */
const pubSubComponent = process.env?.PUBSUB_NAME;
if (pubSubComponent) {
  logger.info(`Using message broker "${objComponent}" !`);
  container
    .bind<IClientPubSub>(TYPES.PubSubClientProxy)
    .toConstantValue(new DaprClient().pubsub);
  container
    .bind<IMessageBroker>(TYPES.MessageBroker)
    .toConstantValue(
      new DaprMessageBroker(
        container.get(TYPES.PubSubClientProxy),
        undefined,
        pubSubComponent
      )
    );
  container.bind<IJobNotifier>(TYPES.JobNotifier).to(JobNotifier);
}

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
