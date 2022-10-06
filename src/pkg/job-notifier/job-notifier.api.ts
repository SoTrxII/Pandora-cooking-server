export enum CookingState {
  InProgress,
  Done,
  Error,
}

/** A job event is something happening to a job */
export interface IJobEvent {
  /** Record id */
  recordId: string;
  jobId?: string;
  state: CookingState;
  data: any;
}

/** A job progress is a peculiar Job Event, as it requires an additional argument */
export interface IJobProgress extends IJobEvent {
  data: {
    /** Size of the transcoded record (bytes) */
    totalBytes: number;
  };
}
export interface IJobError extends IJobEvent {
  data: {
    /** Error message */
    message: string;
  };
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
  sendJobError(payload: IJobError): Promise<void>;
}
