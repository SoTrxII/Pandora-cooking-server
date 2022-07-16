import { inject, injectable, optional } from "inversify";
import { TYPES } from "../../types";
import { IObjectStore } from "../../pkg/object-store/objet-store-api";
import {
  ICookingOptions,
  ICooking,
  IRecordMetadata,
} from "../../pkg/cooker/cook-api";
import { Readable } from "stream";
import { IRecordsService, RecordError } from "./records.service.api";
import { writeFile } from "fs/promises";
import { join } from "path";

@injectable()
export class RecordsService implements IRecordsService {
  constructor(
    @inject(TYPES.ObjectStore) @optional() private objStore: IObjectStore,
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

  getMetadata(options: ICookingOptions): IRecordMetadata {
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
}
