import { Readable } from "stream";
import { ICookingOptions } from "../../pkg/cooker/cook-api";

export interface IRecordsService {
  stream(id: number, options: ICookingOptions): Readable;
  exists(id: number): boolean;
  getMetadata(options: ICookingOptions);
  delete(id: number): boolean
}
