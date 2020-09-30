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

export enum ALLOWED_CONTAINERS {
  MIX = "mix",
  AUPZIP = "aupzip",
  ZIP = "zip",
  MATROSKA = "matroska",
  OGG = "ogg",
}

/**
 * All files metadata for a given container, except for mix
 */
export const CONTAINERS_METADATA_MAP = new Map([
  [ALLOWED_CONTAINERS.AUPZIP, { extension: ".aup.zip", mime: "application/zip" }],
  [ALLOWED_CONTAINERS.ZIP, { extension: ".zip", mime: "application/zip" }],
  [ALLOWED_CONTAINERS.MATROSKA, { extension: ".mkv", mime: "video/x-matroska" }],
  [ALLOWED_CONTAINERS.OGG, { extension: ".ogg", mime: "audio/ogg" }],
]);

/**
 * When using a "mix" container, the resulting file extension depends on the audio stream.
 */
export const FORMATS_METADATA_MAP = new Map([
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
