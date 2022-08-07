import { inject, optional } from "inversify";
import {
  IMessageBroker,
  IPubSubClientProxy,
  IPubSubServerProxy,
} from "./message-broker-api";
import { TYPES } from "../../types";

export class DaprMessageBroker implements IMessageBroker {
  constructor(
    @inject(TYPES.PubSubClientProxy)
    private readonly client: IPubSubClientProxy,
    @inject(TYPES.PubSubServerProxy)
    @optional()
    private readonly server: IPubSubServerProxy,
    private readonly pubSubName: string
  ) {}

  async addSubscription(
    event: string,
    cb: (data: any) => Promise<void>
  ): Promise<void> {
    if (this.server === undefined)
      throw new Error("Pub/Sub server not defined");
    await this.server.subscribe(this.pubSubName, event, cb);
  }

  async startListening(): Promise<void> {
    if (this.server === undefined)
      throw new Error("Pub/Sub server not defined");
    await this.server.start();
  }

  async publish(event: string, data?: any): Promise<boolean> {
    return this.client.publish(this.pubSubName, event, data);
  }
}
