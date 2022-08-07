import "reflect-metadata";
import { JobNotifier } from "./job-notifier";
import { Substitute } from "@fluffy-spoon/substitute";
import { IMessageBroker } from "../../internal/message-broker/message-broker-api";
import { ILogger } from "../logger/logger-api";

describe("Job notifier", () => {
  const jobNot = getMockedJobNotifier();

  it("Send data", async () => await jobNot.sendData("test"));

  it("Send progress event", async () =>
    await jobNot.sendJobProgress({ id: "1", totalBytes: 0 }));

  it("Send done event", async () => await jobNot.sendJobDone({ id: "1" }));

  it("Send error event", async () => await jobNot.sendJobError({ id: "1" }));
});

function getMockedJobNotifier() {
  return new JobNotifier(
    Substitute.for<IMessageBroker>(),
    Substitute.for<ILogger>()
  );
}
