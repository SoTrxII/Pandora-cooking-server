/**
 * These are integration tests, meant to be run alongside DAPR
 * These are ignored by jest coverage
 */
import "reflect-metadata";
import { RecordsService } from "./records.service";
import { ExternalObjectStore } from "../../pkg/object-store/external-objet-store";
import { DaprObjectStorageAdapter } from "../../pkg/object-store/dapr-object-storage-adapter";
import { DaprClient } from "@dapr/dapr";
import { Cooker } from "../../pkg/cooker/cook";
import { join } from "path";
import { IObjectStore } from "../../pkg/object-store/objet-store-api";
import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  ICooking,
} from "../../pkg/cooker/cook-api";
import { tmpdir } from "os";
import { cp, mkdtemp, readdir, rm } from "fs/promises";
import { setTimeout } from "timers/promises";
import { createWriteStream } from "fs";

const SAMPLE_RECORD_ID = 872660673;
describe("Record Service :: Integration", () => {
  describe("Remote object store contain the desired record", () => {
    let testDir: string;
    let deps: IRecordsDeps;
    // Names of all the sample record files
    let sampleRecordFiles: string[];
    beforeEach(async () => {
      // Prepare a target dir the records should be downloaded in
      testDir = await mkdtemp(join(tmpdir(), "test-rec"));
      deps = getRecordsService(testDir);
      // Upload all files on remote
      sampleRecordFiles = await setupRemoteStore(
        deps.objStore,
        SAMPLE_RECORD_ID
      );
    });

    it("Successfully download all files", async () => {
      await deps.rServ.downloadFromRemote(SAMPLE_RECORD_ID, testDir);
      const filesInTestDir = await readdir(testDir);
      expect(
        sampleRecordFiles.every((s) => filesInTestDir.includes(s))
      ).toEqual(true);
    });

    it("Find the files", async () => {
      expect(await deps.rServ.existsOnRemote(SAMPLE_RECORD_ID)).toEqual(true);
    });

    // /!\ Because of the flock mechanism used, this test can only work on Linux /!\
    it("Delete the files", async () => {
      // Delete from remote
      await deps.rServ.delete(SAMPLE_RECORD_ID);
      // Deletion is async
      await setTimeout(5000);
      // Check deletion directly with the object storage
      const fileList = await deps.objStore.list({
        prefix: String(SAMPLE_RECORD_ID),
      });
      expect(fileList?.Contents?.length).toEqual(0);
    }, 10000);

    // /!\ Because of the flock mechanism used, this test can only work on Linux /!\
    it("Stream from a remote file", async () => {
      const stream = await deps.rServ.stream(SAMPLE_RECORD_ID, {
        format: ALLOWED_FORMATS.COPY,
        container: ALLOWED_CONTAINERS.ZIP,
        dynaudnorm: false,
      });
      stream.pipe(createWriteStream(join(testDir, "sample-res.zip")));
    }, 20000);

    afterEach(async () => {
      await deps.objStore.delete(...sampleRecordFiles);
      try {
        await rm(testDir, { recursive: true });
      } catch (e) {
        // It doesn't matter if it fails
      }
    });
  });
  describe("Local FS contain the desired record", () => {
    let testDir: string;
    let deps: IRecordsDeps;
    // Names of all the sample record files
    let sampleRecordFiles: string[];
    beforeEach(async () => {
      // Prepare a target dir the records should be downloaded in
      testDir = await mkdtemp(join(tmpdir(), "test-rec"));
      deps = getRecordsService(testDir);
      const projectRoot = join(__dirname, "../../..");
      await cp(join(projectRoot, "src", "assets"), testDir, {
        recursive: true,
      });
    });

    it("Find the files", async () => {
      expect(await deps.rServ.exists(SAMPLE_RECORD_ID)).toEqual(true);
    });

    // /!\ Because of the flock mechanism used, this test can only work on Linux /!\
    it("Delete the files", async () => {
      // Delete from remote
      await deps.rServ.delete(SAMPLE_RECORD_ID);
    }, 10000);

    // /!\ Because of the flock mechanism used, this test can only work on Linux /!\
    it("Stream from a local file", async () => {
      const stream = await deps.rServ.stream(SAMPLE_RECORD_ID, {
        format: ALLOWED_FORMATS.COPY,
        container: ALLOWED_CONTAINERS.ZIP,
        dynaudnorm: false,
      });
      stream.pipe(createWriteStream(join(testDir, "sample-res.zip")));
    }, 20000);

    afterEach(async () => {
      try {
        await rm(testDir, { recursive: true });
      } catch (e) {
        // It doesn't matter if it fails
      }
    });
  });

  describe("Stream", () => {
    it("When record directly on local storage", () => {});
    it("When record on remote object storage", () => {
      // Setup : Upload record files on remote
    });
  });
  describe("Download record from remote...", () => {
    it("But it doesn't exists", () => {});
  });

  describe("Exists on remote", () => {
    it("Yes", () => {});
    it("No", () => {});
  });

  describe("Delete", () => {
    it("Local", () => {});
    it("Local && Remote", () => {});
  });
});

interface IRecordsDeps {
  objStore: IObjectStore;
  cooker: ICooking;
  rServ: RecordsService;
}

function getRecordsService(recordsPath: string): IRecordsDeps {
  const objStore = new ExternalObjectStore(
    new DaprObjectStorageAdapter(new DaprClient().binding, "object-store")
  );
  const cooker = new Cooker(recordsPath, join(__dirname, "../../.."));
  return {
    objStore,
    cooker,
    rServ: new RecordsService(objStore, cooker),
  };
}

/**
 * Setup the remote object storage to contain all files from the assets
 * dir containing `recordId` in their name
 * @param objStore
 * @param recordId
 */
async function setupRemoteStore(
  objStore: IObjectStore,
  recordId: number
): Promise<string[]> {
  // Upload the sample record files
  const projectRoot = join(__dirname, "../../../");
  const assetsDir = join(projectRoot, "src", "assets");
  // From the assets dir...
  const sampleRecordFiles = (await readdir(assetsDir))
    // Take all files containing the sample record ID...
    .filter((f) => f.includes(String(recordId)));
  const sampleFilesPath = sampleRecordFiles
    // and return their absolute paths
    .map((f) => join(assetsDir, f));
  await objStore.create(...sampleFilesPath);

  return sampleRecordFiles;
}
