import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../../constants";
import { Cooker, CookerOptionsInvalidError } from "./cook";
import { CookingOptions } from "./cook-api";

/**
 * All tests. As the cooking code isn't mine, I don't exactly know what can go wrong.
 * Using this "all paths bruteforce" approach isn't very clever but hey, it works
 */
describe("Cooking", () => {
  const SAMPLE_ID = 872660673;
  const TIMEOUT = 30000;
  // There is no way the resulting file is less than 1MB, no matter the audio codec used
  const FILE_MIN_SIZE = 1048576;
  async function orderCooking(
    id: number,
    options: CookingOptions
  ): Promise<number> {
    let size = 0;
    return new Promise((res, rej) => {
      setTimeout(() => rej(), TIMEOUT);
      const cookingProcess = Cooker.cook(id, options);
      cookingProcess.on("data", (d: Buffer) => (size += d.length));
      cookingProcess.on("end", () => res(size));
    });
  }
  describe("Mixed", () => {
    it(
      "Oggflac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.OGGFLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "flac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.FLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "aac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.AAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "opus",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.OPUS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it.skip(
      "heaac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.HEAAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "adpcm",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "copy",
      async () => {
        await expect(
          orderCooking(SAMPLE_ID, {
            dynaudnorm: false,
            container: ALLOWED_CONTAINERS.MIX,
            format: ALLOWED_FORMATS.COPY,
          })
        ).rejects.toThrow(CookerOptionsInvalidError);
      },
      TIMEOUT
    );

    it(
      "mp3",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.MP3,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "ra",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.RA,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "vorbis",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.VORBIS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wav",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.WAV,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wa8",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MIX,
          format: ALLOWED_FORMATS.WAV8,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );
  });
  describe("Zipped Audacity project file", () => {
    it(
      "Oggflac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.OGGFLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "flac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.FLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "aac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.AAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "opus",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.OPUS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it.skip(
      "heaac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.HEAAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "adpcm",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "copy",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "mp3",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.MP3,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "ra",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.RA,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "vorbis",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.VORBIS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wav",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.WAV,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wa8",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.AUPZIP,
          format: ALLOWED_FORMATS.WAV8,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );
  });
  describe("Zipped file", () => {
    it(
      "Oggflac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.OGGFLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "flac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.FLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "aac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.AAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "opus",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.OPUS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it.skip(
      "heaac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.HEAAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "adpcm",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "copy",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "mp3",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.MP3,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "ra",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.RA,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "vorbis",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.VORBIS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wav",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.WAV,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wa8",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.ZIP,
          format: ALLOWED_FORMATS.WAV8,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );
  });
  describe("Matroska", () => {
    it(
      "Oggflac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.OGGFLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "flac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.FLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "aac",
      async () => {
        await expect(
          orderCooking(SAMPLE_ID, {
            dynaudnorm: false,
            container: ALLOWED_CONTAINERS.OGG,
            format: ALLOWED_FORMATS.AAC,
          })
        ).rejects.toThrow(CookerOptionsInvalidError);
      },
      TIMEOUT
    );

    it(
      "opus",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.OPUS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it.skip(
      "heaac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.HEAAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "adpcm",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "copy",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "mp3",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.MP3,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "ra",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.RA,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "vorbis",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.VORBIS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wav",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.WAV,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wa8",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.MATROSKA,
          format: ALLOWED_FORMATS.WAV8,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );
  });
  describe("Ogg", () => {
    it(
      "Oggflac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.OGGFLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "flac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.FLAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "aac",
      async () => {
        await expect(
          orderCooking(SAMPLE_ID, {
            dynaudnorm: false,
            container: ALLOWED_CONTAINERS.OGG,
            format: ALLOWED_FORMATS.AAC,
          })
        ).rejects.toThrow(CookerOptionsInvalidError);
      },
      TIMEOUT
    );

    it(
      "opus",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.OPUS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it.skip(
      "heaac",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.HEAAC,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "adpcm",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "copy",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.ADPCM,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "mp3",
      async () => {
        await expect(
          orderCooking(SAMPLE_ID, {
            dynaudnorm: false,
            container: ALLOWED_CONTAINERS.OGG,
            format: ALLOWED_FORMATS.MP3,
          })
        ).rejects.toThrow(CookerOptionsInvalidError);
      },
      TIMEOUT
    );

    it(
      "ra",
      async () => {
        await expect(
          orderCooking(SAMPLE_ID, {
            dynaudnorm: false,
            container: ALLOWED_CONTAINERS.OGG,
            format: ALLOWED_FORMATS.RA,
          })
        ).rejects.toThrow(CookerOptionsInvalidError);
      },
      TIMEOUT
    );

    it(
      "vorbis",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.VORBIS,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wav",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.WAV,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );

    it(
      "wa8",
      async () => {
        const size = await orderCooking(SAMPLE_ID, {
          dynaudnorm: false,
          container: ALLOWED_CONTAINERS.OGG,
          format: ALLOWED_FORMATS.WAV8,
        });
        console.log(size);
        expect(size).toBeGreaterThan(FILE_MIN_SIZE);
      },
      TIMEOUT
    );
  });
});
