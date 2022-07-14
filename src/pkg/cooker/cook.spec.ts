import "reflect-metadata";
import { Cooker } from "./cook";
import { cp, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

describe("Cooking", () => {
  let cooker: Cooker;
  const RECORD_SAMPLE_ID = 872660673;
  let testDir: string;

  beforeAll(async () => {
    const projectRoot = join(__dirname, "../../../");
    // MAke a temp dir and copy rec/ file into it for testing
    testDir = await mkdtemp(join(tmpdir(), "test-rec"));
    await cp(join(projectRoot, "src", "assets"), testDir, { recursive: true });
    cooker = new Cooker(testDir, join(projectRoot, "cook.sh"));
  });

  describe("Exists", () => {
    it("True if exists", () => {
      expect(cooker.exists(RECORD_SAMPLE_ID)).toEqual(true);
    });
    it("False if not exists", () => {});
  });

  describe("Validate options", () => {});

  describe("Cooking", () => {});

  describe("Metadata handling", () => {});

  describe("Locking", () => {});

  describe("Delete", () => {});

  afterAll(async () => {
    try {
      await rm(testDir, { recursive: true });
    } catch (e) {
      // We don't care if it fails
    }
  });
});
