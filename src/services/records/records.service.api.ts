import { Readable } from "stream";
import {
  ICookingOptions,
  IFileMetadata,
  IRecordMetadata,
} from "../../pkg/cooker/cook-api";

export class RecordError extends Error {}
export interface IRecordsService {
  /**
   * Get an audio stream from a record id and parameters
   * /!\ The record must exists /!\
   * @throws RecordError if the records files aren't on the local FS and couldn't be fetched on the remote obj storage
   * @param id
   * @param options
   */
  stream(id: number, options: ICookingOptions): Promise<Readable>;

  /**
   * Return true if the records exits on the local FS or remote obj storage (if defined)
   * @param id Record id
   */
  exists(id: number): Promise<boolean>;

  /**
   * Return file metadata corresponding to the given options
   * @param options
   */
  getMetadata(options: ICookingOptions): IFileMetadata;

  /**
   * Delete the record from the local FS and remote object storage (if defined)
   * @param id
   */
  delete(id: number): Promise<boolean>;

  /**
   * Retrieve info written by Pandora when the record started
   * @throws RecordError if the info could not be retrieved
   * @param id
   */
  getRecordMetadata(id: number): Promise<Partial<IRecordMetadata>>;
}
