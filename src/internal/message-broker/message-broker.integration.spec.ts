import "reflect-metadata";
import { DaprMessageBroker } from "./dapr-message-broker";
import { DaprClient, DaprServer } from "@dapr/dapr";

describe("Message Broker :: Integration", () => {
  const controlClient = new DaprClient().pubsub;
  const controlServer = new DaprServer();
  const mb = new DaprMessageBroker(
    new DaprClient().pubsub,
    undefined,
    "pubsub"
  );
  it("Add a subscription", async () => {
    await expect(
      mb.addSubscription("topic", (data) => Promise.resolve(console.log(data)))
    ).resolves.not.toThrow();
  });
  it("Publish a message", async () => {
    const dataReceived = new Promise((res, rej) => {
      controlServer.pubsub.subscribe("pubsub", "topic", (data) =>
        Promise.resolve(res(data))
      );
      setTimeout(rej, 3000);
    });

    await controlServer.start();
    await expect(mb.publish("topic", "test")).resolves.not.toThrow();
    await expect(dataReceived).resolves.not.toThrow();
    expect(await dataReceived).toEqual("test");
  });
  it("Start the server", async () => {
    await expect(mb.startListening()).resolves.not.toThrow();
  });
});
