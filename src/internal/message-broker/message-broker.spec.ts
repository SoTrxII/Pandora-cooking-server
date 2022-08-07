import "reflect-metadata";
import { DaprMessageBroker } from "./dapr-message-broker";
import { Substitute } from "@fluffy-spoon/substitute";
import { IPubSubClientProxy, IPubSubServerProxy } from "../../../../Velvet/src/internal/proxies/proxies";

describe("Message broker", () => {
  const mb = new DaprMessageBroker(
    Substitute.for<IPubSubClientProxy>(),
    Substitute.for<IPubSubServerProxy>(),
    ""
  );
  // There is not a whole lot to test in unit testing
  it("Add a subscription", async () => {
    await expect(
      mb.addSubscription("topic", (data) => Promise.resolve(console.log(data)))
    ).resolves.not.toThrow();
  });
  it("Publish a message", async () => {
    await expect(mb.publish("topic", "test")).resolves.not.toThrow();
  });
  it("Start the server", async () => {
    await expect(mb.startListening()).resolves.not.toThrow();
  });
});
