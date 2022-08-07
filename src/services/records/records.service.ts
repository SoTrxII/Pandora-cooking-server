import { inject, injectable, optional } from "inversify";
import { TYPES } from "../../types";
import { IObjectStore } from "../../pkg/object-store/objet-store-api";
import {
  ICookingOptions,
  ICooking,
  IFileMetadata,
  IRecordMetadata,
} from "../../pkg/cooker/cook-api";
import { Readable, Transform, Writable } from "stream";
import {
  IJobOptions,
  IRecordsService,
  RecordError,
} from "./records.service.api";
import { unlink, writeFile } from "fs/promises";
import { join } from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { tmpdir } from "os";
import { IJobNotifier } from "../../pkg/job-notifier/job-notifier.api";

@injectable()
export class RecordsService implements IRecordsService {
  constructor(
    @inject(TYPES.ObjectStore) @optional() private objStore: IObjectStore,
    @inject(TYPES.JobNotifier) @optional() private jobNotifier: IJobNotifier,
    @inject(TYPES.Cooking) private cooker: ICooking
  ) {}

  async stream(id: number, options: ICookingOptions): Promise<Readable> {
    // Download the file from the remote object storage if needed
    if (!this.existsOnLocal(id) && this.objStore !== undefined)
      await this.downloadFromRemote(id, this.cooker.recordingsDir);
    // And then cook
    return this.cooker.cook(id, options);
  }

  /**
   * Downloads all files prefixed by `id` on the local file system
   * @param id
   */
  async downloadFromRemote(id: number, path: string): Promise<void> {
    if (this.objStore === undefined)
      throw new RecordError(
        "Attempted to download files from an undefined object store"
      );
    // Search for the records files...
    const list = await this.objStore.list({ prefix: String(id) });
    if (list.Contents.length === 0)
      throw new RecordError("No files on the remote service for this record");
    // Retrieve the data from each files...
    const files = await this.objStore.retrieve(
      ...list.Contents.map((i) => i.Key)
    );
    // And write them on the local FS
    const written = await Promise.allSettled(
      Array.from(files.entries()).map(
        async ([name, file]) => await writeFile(join(path, name), file)
      )
    );
    const failedWrite = written.filter((up) => up.status === "rejected");
    if (failedWrite.length > 0)
      throw new RecordError(
        failedWrite.map((fail: PromiseRejectedResult) => fail.reason).join("\n")
      );
  }

  async exists(id: number): Promise<boolean> {
    // Check on local FS
    //    If yes -> OK
    let exists = this.existsOnLocal(id);
    //    If no -> Check on the remote object storage
    //        If on remote -> return true
    //        If not on remote -> false
    if (this.objStore !== undefined && !exists)
      exists = await this.existsOnRemote(id);
    return exists;
  }

  /**
   * Returns true if at least an uploaded file containing the id
   * `id` exists on remote
   * @param id
   */
  async existsOnRemote(id: number): Promise<boolean> {
    const list = await this.objStore.list({ prefix: String(id) });
    return list.Contents.length > 0;
  }

  /**
   * Return true if the records exists on the local file system
   * @param id
   */
  existsOnLocal(id: number): boolean {
    return this.cooker.exists(id);
  }

  getMetadata(options: ICookingOptions): IFileMetadata {
    return this.cooker.getFileMetadataFor(options);
  }

  async delete(id: number): Promise<boolean> {
    // Delete on local FS
    const hasBeenDeleted = this.cooker.delete(id);

    // If remote object store is defined, delete from there too
    if (
      hasBeenDeleted &&
      this.objStore !== undefined &&
      (await this.existsOnRemote(id))
    ) {
      const list = await this.objStore.list({ prefix: String(id) });
      await this.objStore.delete(...list.Contents.map((c) => c.Key));
    }
    return hasBeenDeleted;
  }

  async getRecordMetadata(id: number): Promise<Partial<IRecordMetadata>> {
    try {
      return await this.cooker.getRecordMetadata(id);
    } catch (e) {
      throw new RecordError(e);
    }
  }

  async startAsyncTranscodingJob(
    stream: Readable,
    id: string,
    cookOpt: ICookingOptions,
    jobOpt: Partial<IJobOptions> = {}
  ): Promise<void> {
    const defaultJobOpt: IJobOptions = {
      progressInterval: 2000,
      writeDataSamplingRate: 100,
    };
    const jobOptions = Object.assign(defaultJobOpt, jobOpt);
    const meta = await this.getMetadata(cookOpt);
    const path = join(tmpdir(), id + meta.extension);
    let totalBytes = 0;

    let progressInterval = undefined;
    if (this.jobNotifier !== undefined) {
      // To handle progress, we publish the current bytes written every X seconds
      // We can't know at this time the total size
      progressInterval = setInterval(
        async () => await this.jobNotifier.sendJobProgress({ totalBytes, id }),
        jobOptions.progressInterval
      );
    }

    try {
      await this.writeToDisk(path, stream, {
        // 64KB * 100 = 6,4MB
        samplingRate: jobOptions.writeDataSamplingRate,
        // The reason the progress isn't published here is that this function
        // will not be awaited (it would cause perf issues). So we can't handle
        // any synchronous error in this function.
        pgCallback: async (total) => {
          totalBytes = total;
        },
      });
      await this.jobNotifier.sendJobDone({ id });
      // If the object store is defined, upload to transcoded file
      // and remove it from the disk
      if (this.objStore !== undefined) {
        await this.objStore.create(path);
        await unlink(path);
      }
    } catch (e) {
      await this.jobNotifier.sendJobError({ id });
      throw e;
    } finally {
      // In any case remove the zombie interval
      if (progressInterval !== undefined) clearInterval(progressInterval);
    }
  }
  /**
   * Write a record audio stream to the local FS
   * @param path
   * @param stream
   */
  async writeToDisk(
    path: string,
    stream: Readable,
    progressOpt: {
      /** progress callback. must be async and will not be awaited  */
      pgCallback: (currentBytes: number) => Promise<void>;
      /** the progress callback will be called one time every `sampleRate` data event
       * By default, a pipe chunk is 64KB (roughly) */
      samplingRate: number;
    }
  ) {
    let destFile: Writable;
    try {
      destFile = createWriteStream(path);
    } catch (e) {
      throw new RecordError(
        `File ${path} cannot be created. Reason ${e.message}`
      );
    }

    try {
      // An integer limit in JS is 2**53, this should be enough in any case
      let totalBytes = 0;
      let tick = 0;
      // This NO-OP transform stream is used to count the data passing through it
      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          totalBytes += chunk.length;
          tick = ++tick % progressOpt.samplingRate;
          if (tick === 0) progressOpt.pgCallback(totalBytes);
          this.push(chunk);
          callback();
        },
      });
      await pipeline(stream, progressTracker, destFile);
    } catch (e) {
      throw new RecordError(
        `Error while writing record stream to disk. Reason ${e.message}`
      );
    }
  }
}
