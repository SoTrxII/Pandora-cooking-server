import "reflect-metadata";
import { JobNotifier } from "./job-notifier";
import { Substitute } from "@fluffy-spoon/substitute";
import { IMessageBroker } from "../../internal/message-broker/message-broker-api";
import { ILogger } from "../logger/logger-api";
import { CookingState } from "./job-notifier.api";

describe("Job notifier", () => {
  const jobNot = getMockedJobNotifier();

  it("Send data", async () => await jobNot.sendData("test"));

  it("Send progress event", async () =>
    await jobNot.sendJobProgress({
      recordId: "1",
      state: CookingState.InProgress,
      data: { totalBytes: 0 },
    }));

  it("Send done event", async () =>
    await jobNot.sendJobDone({
      recordId: "1",
      state: CookingState.Done,
      data: null,
    }));

  it("Send error event", async () =>
    await jobNot.sendJobError({
      recordId: "1",
      state: CookingState.InProgress,
      data: { message: "test" },
    }));
});

function getMockedJobNotifier() {
  return new JobNotifier(
    Substitute.for<IMessageBroker>(),
    Substitute.for<ILogger>()
  );
}
