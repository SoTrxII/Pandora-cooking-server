import { inject } from "inversify";
import { TYPES } from "../../types";
import { IMessageBroker } from "../../internal/message-broker/message-broker-api";
import { IJobEvent, IJobNotifier, IJobProgress } from "./job-notifier.api";
import { ILogger } from "../logger/logger-api";

export class JobNotifier implements IJobNotifier {
  static readonly TOPICS = {
    progress: "cookingProgress",
    error: "cookingError",
    done: "cookingDone",
  };
  constructor(
    @inject(TYPES.MessageBroker) private broker: IMessageBroker,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async sendJobProgress(payload: IJobProgress) {
    await this.sendData(JobNotifier.TOPICS.progress, payload);
  }

  async sendJobDone(payload: IJobEvent) {
    await this.sendData(JobNotifier.TOPICS.done, payload);
  }

  async sendJobError(payload: IJobEvent) {
    await this.sendData(JobNotifier.TOPICS.error, payload);
  }

  /**
   * Send a payload to a topic, log if failing
   * @param topic
   * @param payload
   */
  async sendData<T extends IJobEvent>(
    topic: string,
    payload?: T
  ): Promise<void> {
    try {
      await this.broker.publish(topic, payload);
    } catch (e) {
      this.logger.warn(
        `[Job Notifier] :: Error while sending data to topic ${topic}`,
        e
      );
    }
  }
}
