import { CookingOptions } from "./cook-api";
import { resolve } from "path";
import { existsSync, unlinkSync } from "fs";
import { execSync, spawn } from "child_process";
import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  CONTAINERS_METADATA_MAP,
  FORMATS_METADATA_MAP,
} from "../../constants";

export class CookerOptionsInvalidError extends Error {}
export class Cooker {
  private static SUFFIXES = [
    ".ogg.data",
    ".ogg.header1",
    ".ogg.header2",
    ".ogg.info",
    ".ogg.users",
  ];
  private static get BASE_PATH(): string {
    // Dev mode
    if (__dirname.includes("src")) {
      return resolve(__dirname, "/../../..");
    }
    // Prod Mode, there is no src
    return resolve(__dirname, "/../..");
  }

  private static get RECORDINGS_PATH(): string {
    return `${Cooker.BASE_PATH}/rec`;
  }

  static recordExists(id: number): boolean {
    const fileBase = `${Cooker.RECORDINGS_PATH}/${id}`;
    return Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).every(existsSync);
  }

  static validateOptions(options: CookingOptions): void {
    // Copy just copies the entire temp dir, it can't be post-processed
    if (
      options.format === ALLOWED_FORMATS.COPY &&
      options.container !== ALLOWED_CONTAINERS.AUPZIP
    ) {
      throw new CookerOptionsInvalidError(
        `Format ${ALLOWED_FORMATS.COPY} can only produce zip files ! Please select ${ALLOWED_CONTAINERS.AUPZIP} container!`
      );
    }

    // An OGG container cannot contain all audio format (every non-free one basically).
    const bannedFormatsForOgg = [
      ALLOWED_FORMATS.MP3,
      ALLOWED_FORMATS.AAC,
      ALLOWED_FORMATS.HEAAC,
      ALLOWED_FORMATS.RA,
    ];

    if (
      options.container === ALLOWED_CONTAINERS.OGG &&
      bannedFormatsForOgg.includes(options.format)
    ) {
      throw new CookerOptionsInvalidError(
        `Container ${
          ALLOWED_CONTAINERS.OGG
        } cannot contain ${bannedFormatsForOgg.join(
          " or "
        )} audio streams ! You must select another format`
      );
    }

    const bannedFormatsForMatroska = [
      ALLOWED_FORMATS.HEAAC,
      ALLOWED_FORMATS.AAC,
    ];

    if (
      options.container === ALLOWED_CONTAINERS.MATROSKA &&
      bannedFormatsForMatroska.includes(options.format)
    ) {
      throw new CookerOptionsInvalidError(
        `Container ${
          ALLOWED_CONTAINERS.MATROSKA
        } cannot contain ${bannedFormatsForMatroska.join(
          " or "
        )} audio streams for some reason ! You must select another format`
      );
    }
  }

  static cook(id: number, options: CookingOptions) {
    Cooker.validateOptions(options);
    const cookingProcess = spawn(
      resolve(Cooker.BASE_PATH, `./cook.sh`),
      [String(id), options.format, options.container],
      {
        cwd: __dirname,
      }
    );
    cookingProcess.stderr.on("data", (data) => console.log(data.toString()));
    return cookingProcess.stdout;
  }

  static getFileMetadataFor(options: CookingOptions) {
    if (CONTAINERS_METADATA_MAP.has(options.container)) {
      return CONTAINERS_METADATA_MAP.get(options.container);
    }
    // The container is "mix", check the file extension at the format level
    if (FORMATS_METADATA_MAP.has(options.format)) {
      return FORMATS_METADATA_MAP.get(options.format);
    }
    // Unknown format, fallback to the generic octet-stream
    return {
      extension: "",
      mime: "application/octet-stream",
    };
  }

  static getExclusiveLock(fileBase: string): boolean {
    try {
      execSync(`exec 9< "${fileBase}.ogg.data" && (flock -n 9 || exit 1)`);
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  static delete(id: number): boolean {
    const fileBase = `${Cooker.RECORDINGS_PATH}/${id}`;
    // This isn't a pretty solution, flock() is not compatible with every file system
    const isLocked = Cooker.getExclusiveLock(fileBase);
    if (isLocked)
      Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).forEach(unlinkSync);
    return isLocked;
  }
}
