import "reflect-metadata";
import { Cooker } from "./cook";
import { cp, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  ICookingOptions,
} from "./cook-api";

describe("Cooking", () => {
  let cooker: Cooker;
  const RECORD_SAMPLE_ID = 872660673;
  let testDir: string;
  let projectRoot: string;

  beforeAll(async () => {
    projectRoot = join(__dirname, "../../../");
    // MAke a temp dir and copy rec/ file into it for testing
    testDir = await mkdtemp(join(tmpdir(), "test-rec"));
    await cp(join(projectRoot, "src", "assets"), testDir, { recursive: true });
    cooker = new Cooker(testDir, projectRoot);
  });

  describe("Exists", () => {
    it("True if exists", () =>
      expect(cooker.exists(RECORD_SAMPLE_ID)).toEqual(true));
    it("False if not exists", () => expect(cooker.exists(1)).toEqual(false));
  });

  describe("Validate options", () => {
    // Archive containers must be associated with "COPY" format
    describe("Archive containers", () => {
      const zippedOk: ICookingOptions[] = [
        {
          format: ALLOWED_FORMATS.COPY,
          container: ALLOWED_CONTAINERS.AUPZIP,
          dynaudnorm: false,
        },
        {
          format: ALLOWED_FORMATS.COPY,
          container: ALLOWED_CONTAINERS.ZIP,
          dynaudnorm: false,
        },
      ];
      it.each(zippedOk)("Zipped containers, copy format %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).not.toThrow()
      );
      // Build an array of every possible format associated with the zip container.
      // All these should be invalid
      const zippedKo: ICookingOptions[] = Object.values(ALLOWED_CONTAINERS)
        .filter(
          (v) => v !== ALLOWED_CONTAINERS.AUPZIP && v !== ALLOWED_CONTAINERS.ZIP
        )
        .map((v) => {
          return {
            format: ALLOWED_FORMATS.COPY,
            container: v,
            dynaudnorm: false,
          };
        });
      it.each(zippedKo)("Copy format, not zipped container %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).toThrow()
      );
    });
    // The OGG container is special, it must contain a non-free format
    describe("OGG container", () => {
      // All these are non-free
      const banList = [
        ALLOWED_FORMATS.MP3,
        ALLOWED_FORMATS.AAC,
        ALLOWED_FORMATS.HEAAC,
        ALLOWED_FORMATS.RA,
      ];
      const oggKo: ICookingOptions[] = banList.map((banned) => {
        return {
          format: banned,
          container: ALLOWED_CONTAINERS.OGG,
          dynaudnorm: false,
        };
      });
      const oggOk: ICookingOptions[] = Object.values(ALLOWED_FORMATS)
        .filter((v) => !banList.includes(v) && v !== ALLOWED_FORMATS.COPY)
        .map((allowed) => {
          return {
            format: allowed,
            container: ALLOWED_CONTAINERS.OGG,
            dynaudnorm: false,
          };
        });

      it.each(oggOk)("Ogg container, banned format %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).not.toThrow()
      );
      it.each(oggKo)("Ogg container, allowed format %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).toThrow()
      );
    });

    // Matroska should be able to container anything... except for AAC
    describe("Mastroska container", () => {
      // All these are non-free
      const banList = [ALLOWED_FORMATS.AAC, ALLOWED_FORMATS.HEAAC];
      const mkvKo: ICookingOptions[] = banList.map((banned) => {
        return {
          format: banned,
          container: ALLOWED_CONTAINERS.MATROSKA,
          dynaudnorm: false,
        };
      });
      const mkvOk: ICookingOptions[] = Object.values(ALLOWED_FORMATS)
        .filter((v) => !banList.includes(v) && v !== ALLOWED_FORMATS.COPY)
        .map((allowed) => {
          return {
            format: allowed,
            container: ALLOWED_CONTAINERS.MATROSKA,
            dynaudnorm: false,
          };
        });

      it.each(mkvOk)("Ogg container, banned format %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).not.toThrow()
      );
      it.each(mkvKo)("Ogg container, allowed format %s", (opt) =>
        expect(() => cooker.validateOptions(opt)).toThrow()
      );
    });
  });

  describe("Cooking", () => {
    it.skip("Fake cooking", () => {
      cooker.cook(1, {
        format: ALLOWED_FORMATS.MP3,
        container: ALLOWED_CONTAINERS.MIX,
        dynaudnorm: false,
      });
    });
  });

  describe("Metadata handling", () => {
    it.each(Object.values(ALLOWED_FORMATS))("Mix with format %s", (format) => {
      // Each format with the "mix" container should have its own mime
      expect(
        cooker.getFileMetadataFor({
          container: ALLOWED_CONTAINERS.MIX,
          format: format,
          dynaudnorm: false,
        })
      ).not.toEqual("application/octet-stream");
    });
    const otherContainers = Object.values(ALLOWED_CONTAINERS).filter(
      (c) => c !== ALLOWED_CONTAINERS.MIX
    );
    it.each(otherContainers)("Other containers %s", (container) => {
      // Each format with the "mix" container should have its own mime
      expect(
        cooker.getFileMetadataFor({
          container: container,
          format: ALLOWED_FORMATS.OPUS,
          dynaudnorm: false,
        })
      ).not.toEqual("application/octet-stream");
    });
  });

  describe("Get record metadata", () => {
    it("Return metadata when file exists", async () => {
      const info = await cooker.getRecordMetadata(RECORD_SAMPLE_ID);
      expect(info).toEqual({
        key: "0",
        delete: "0",
        requester: "anUser#433443",
        requesterId: "1111111111111",
        startTime: "2020-09-24T12:56:29.760Z",
        guild: "Unlimited Test Work",
        channel: "Général",
      });
    });
    it("Throws when file doesn't exist", async () => {
      await expect(cooker.getRecordMetadata(-1)).rejects.toThrow();
    });
  });

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch (e) {
      // We don't care if it fails
    }
  });
});
