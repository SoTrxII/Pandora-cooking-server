import { inject, injectable, optional } from "inversify";
import { TYPES } from "../../types";
import { ILogger } from "../../pkg/logger/logger-api";
import { IObjectStore } from "../../pkg/object-store/objet-store-api";
import { CookingOptions, ICooking } from "../../pkg/cooker/cook-api";
import { Readable } from "stream";
import { IRecordsService } from "./records.service.api";
import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../../constants";

@injectable()
export class RecordsService implements IRecordsService {
  constructor(
    @inject(TYPES.Logger) private logger: ILogger,
    @inject(TYPES.ObjectStore) @optional() private objStore: IObjectStore,
    @inject(TYPES.Cooking) private cooker: ICooking
  ) {}

  stream(id: number, options: CookingOptions): Readable {
    return this.cooker.cook(id, options);
  }

  exists(id: number): boolean {
    return this.cooker.recordExists(id);
  }

  getMetadata(options: CookingOptions) {
    return this.cooker.getFileMetadataFor(options);
  }

  delete(id: number): boolean {
    return this.cooker.delete(id);
  }
}
