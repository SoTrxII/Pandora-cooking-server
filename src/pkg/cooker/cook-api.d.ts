import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../../constants";
import { Readable } from "stream";

export interface CookingOptions {
  format: ALLOWED_FORMATS;
  container: ALLOWED_CONTAINERS;
  dynaudnorm: boolean;
}

/**
 * A class managing records
 */
export interface ICooking {
  recordExists(id: number): boolean;
  cook(id: number, options: CookingOptions): Readable;
  delete(id: number): boolean;
  getFileMetadataFor(options: CookingOptions);
}
