import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  ICookingOptions,
  ICooking,
  IRecordMetadata,
} from "./cook-api";
import { join, resolve } from "path";
import { existsSync, unlinkSync } from "fs";
import { execSync, spawn } from "child_process";
import { Readable } from "stream";
import { injectable } from "inversify";

export class CookerOptionsInvalidError extends Error {}

@injectable()
export class Cooker implements ICooking {
  /**
   * All files metadata for a given container, except for mix
   */
  static readonly CONTAINERS_METADATA_MAP = new Map([
    [
      ALLOWED_CONTAINERS.AUPZIP,
      { extension: ".aup.zip", mime: "application/zip" },
    ],
    [ALLOWED_CONTAINERS.ZIP, { extension: ".zip", mime: "application/zip" }],
    [
      ALLOWED_CONTAINERS.MATROSKA,
      { extension: ".mkv", mime: "video/x-matroska" },
    ],
    [ALLOWED_CONTAINERS.OGG, { extension: ".ogg", mime: "audio/ogg" }],
  ]);

  /**
   * When using a "mix" container, the resulting file extension depends on the audio stream.
   */
  static readonly FORMATS_METADATA_MAP = new Map([
    [ALLOWED_FORMATS.HEAAC, { extension: ".aac", mime: "audio/aac" }],
    [ALLOWED_FORMATS.AAC, { extension: ".aac", mime: "audio/aac" }],
    [ALLOWED_FORMATS.MP3, { extension: ".mp3", mime: "audio/mp3" }],
    [ALLOWED_FORMATS.WAV, { extension: ".wav", mime: "audio/x-wav" }],
    [ALLOWED_FORMATS.WAV8, { extension: ".wav", mime: "audio/x-wav" }],
    [ALLOWED_FORMATS.ADPCM, { extension: ".raw", mime: "audio/x-wav" }],
    [ALLOWED_FORMATS.RA, { extension: ".ra", mime: "audio/vnd.rn-realaudio" }],
    [ALLOWED_FORMATS.OPUS, { extension: ".ogg", mime: "audio/ogg" }],
    [ALLOWED_FORMATS.VORBIS, { extension: ".ogg", mime: "audio/vorbis" }],
    [ALLOWED_FORMATS.FLAC, { extension: ".flac", mime: "audio/flac" }],
    [ALLOWED_FORMATS.OGGFLAC, { extension: ".ogg", mime: "audio/ogg" }],
  ]);

  private static SUFFIXES = [
    ".ogg.data",
    ".ogg.header1",
    ".ogg.header2",
    ".ogg.info",
    ".ogg.users",
  ];

  /**
   * @param recordingsDir Path to find the raw Pandora/Craig recordings
   * @param cookingScriptPath Path to find the cooking script
   */
  constructor(
    private readonly recordingsDir: string,
    private readonly cookingScriptPath: string
  ) {}

  exists(id: number): boolean {
    const fileBase = join(this.recordingsDir, String(id));
    return Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).every(existsSync);
  }

  validateOptions(options: ICookingOptions): void {
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

  cook(id: number, options: ICookingOptions): Readable {
    this.validateOptions(options);
    const cookingProcess = spawn(
      resolve(this.cookingScriptPath, `./cook.sh`),
      [String(id), options.format, options.container],
      {
        cwd: __dirname,
      }
    );
    cookingProcess.stderr.on("data", (data) => console.log(data.toString()));
    return cookingProcess.stdout;
  }

  getFileMetadataFor(options: ICookingOptions): IRecordMetadata {
    if (Cooker.CONTAINERS_METADATA_MAP.has(options.container)) {
      return Cooker.CONTAINERS_METADATA_MAP.get(options.container);
    }
    // The container is "mix", check the file extension at the format level
    if (Cooker.FORMATS_METADATA_MAP.has(options.format)) {
      return Cooker.FORMATS_METADATA_MAP.get(options.format);
    }
    // Unknown format, fallback to the generic octet-stream
    return {
      extension: "",
      mime: "application/octet-stream",
    };
  }

  getExclusiveLock(fileBase: string): boolean {
    try {
      execSync(`exec 9< "${fileBase}.ogg.data" && (flock -n 9 || exit 1)`);
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  delete(id: number): boolean {
    const fileBase = join(this.recordingsDir, String(id));
    // This isn't a pretty solution, flock() is not compatible with every file system
    const isLocked = this.getExclusiveLock(fileBase);
    if (isLocked)
      Cooker.SUFFIXES.map((s) => `${fileBase}${s}`).forEach(unlinkSync);
    return isLocked;
  }
}
