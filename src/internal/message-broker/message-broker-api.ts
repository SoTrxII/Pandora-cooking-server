/**
 * Proxy interface for a Pub/Sub Client
 */
export interface IPubSubClientProxy {
  /**
   * Publish *data* to a topic *topic* on the pubsub component *pubsubname*
   * @param pubSubName
   * @param topic
   * @param data
   */
  publish(
    pubSubName: string,
    topic: string,
    data?: Record<string, unknown>
  ): Promise<boolean>;
}

/**
 * Proxy interface for a Pub/Sub server
 */
export interface IPubSubServerProxy {
  /**
   * Subscribes to a topic *topic* on the pubsub component name *pubsubname*.
   * Calls *cb* when a message is received
   * @param pubSubName
   * @param topic
   * @param cb
   */
  subscribe(
    pubSubName: string,
    topic: string,
    cb: (data: any) => Promise<any>
  ): Promise<void>;

  /**
   * Starts the server
   */
  start(): Promise<void>;
}
/**
 * Any pub/sub broker
 */
export interface IMessageBroker {
  /**
   * Register *cb* to be called when *topic* is triggered
   * @param topic
   * @param cb
   */
  addSubscription(
    topic: string,
    cb: (data: any) => Promise<void>
  ): Promise<void>;

  /**
   * Start the server.
   * /!\ All subscriptions must be added before using this method
   */
  startListening(): Promise<void>;

  /**
   * Publish a new message with *data* on *topic*
   * @param topic
   * @param data
   */
  publish(topic: string, data?: any): Promise<boolean>;
}
