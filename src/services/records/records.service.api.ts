import { Readable } from "stream";
import { CookingOptions } from "../../pkg/cooker/cook-api";

export interface IRecordsService {
  stream(id: number, options: CookingOptions): Readable;
  exists(id: number): boolean;
  getMetadata(options: CookingOptions);
  delete(id: number): boolean
}
