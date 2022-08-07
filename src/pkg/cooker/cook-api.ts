import { Readable } from "stream";

/**
 * A set of metadata for a cooked record
 */
export interface IFileMetadata {
  /** Described file extension */
  extension: string;
  /** Describe file MIME type */
  mime: string;
}

/**
 * All processable codecs for cooking
 */
export enum ALLOWED_FORMATS {
  COPY = "copy",
  OGGFLAC = "oggflac",
  VORBIS = "vorbis",
  AAC = "aac",
  HEAAC = "heaac",
  FLAC = "flac",
  OPUS = "opus",
  WAV = "wav",
  ADPCM = "adpcm",
  WAV8 = "wav8",
  MP3 = "mp3",
  RA = "ra",
}

/**
 * All available containers for cooking
 */
export enum ALLOWED_CONTAINERS {
  MIX = "mix",
  AUPZIP = "aupzip",
  ZIP = "zip",
  MATROSKA = "matroska",
  OGG = "ogg",
}

export interface ICookingOptions {
  format: ALLOWED_FORMATS;
  container: ALLOWED_CONTAINERS;
  dynaudnorm: boolean;
}

/**
 * Records info other than the recording files themselves
 */
export interface IRecordMetadata {
  /** Username of the user requesting the record */
  requester: string;
  /** Discord ID of the user requesting the record */
  requesterId: string;
  /** Record starting date (timestamp) */
  startTime: string;
  /** Discord guild name */
  guild: string;
  /** Discord channel that was recorded in the guild */
  channel: string;
}

/**
 * A class managing records
 */
export interface ICooking {
  /**
   * Records base directory
   */
  readonly recordingsDir: string;

  /**
   * Return true if every files needed for a recording to be processed are
   * present on the disk
   * @param id
   */
  exists(id: number): boolean;

  /**
   * Transform any raw Pandora/Craig recording into one or multiple files
   * These can be audio/zip or Audacity project depending on the options
   * @param id
   * @param options
   */
  cook(id: number, options: ICookingOptions): Readable;

  /**
   * Deletes a recording for the disk
   * /!\ The fiels cna only be deleted if they aren't being processed /!\
   * @param id
   */
  delete(id: number): boolean;

  /**
   * Guess the mimetype of a file from its expected format and container
   * @param options
   */
  getFileMetadataFor(options: ICookingOptions): IFileMetadata;

  /**
   * Get an exclusive lock on a file
   * /!\ This method can only work in Linux /!\
   * @param filePath
   */
  getExclusiveLock(filePath: string): boolean;

  /**
   * Returns all metadata written by Pandora when the record started
   * /!\ These metadata changes depending on the version of pandora used /!\
   * @throws Error if the info file doesn't exist or the JSON isn't correct
   * @param id
   */
  getRecordMetadata(id: number): Promise<Partial<IRecordMetadata>>;
}
