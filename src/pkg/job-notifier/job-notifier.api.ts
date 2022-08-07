/** A job event is something happening to a job */
export interface IJobEvent {
  /** Record id */
  id: string;
}

/** A job progress is a peculiar Job Event, as it requires an additional argument */
export interface IJobProgress extends IJobEvent {
  /** Size of the transcoded record (bytes) */
  totalBytes: number;
}

/**
 * Wrapper to notify remote service about transcoding jobs
 */
export interface IJobNotifier {
  /**
   * Notify a data
   * @param payload
   */
  sendJobProgress(payload: IJobProgress): Promise<void>;

  /**
   *
   * @param payload
   */
  sendJobDone(payload: IJobEvent): Promise<void>;

  /**
   * Alert that a job errored
   * @param payload
   */
  sendJobError(payload: IJobEvent): Promise<void>;
}
