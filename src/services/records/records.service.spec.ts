import "reflect-metadata";
import { RecordsService } from "./records.service";
import { Arg, Substitute, SubstituteOf } from "@fluffy-spoon/substitute";
import {
  ALLOWED_CONTAINERS,
  ALLOWED_FORMATS,
  ICooking,
  ICookingOptions,
} from "../../pkg/cooker/cook-api";
import { IObjectStore } from "../../pkg/object-store/objet-store-api";
import { tmpdir } from "os";
import { RecordError } from "./records.service.api";

const SAMPLE_RECORD_ID = 872660673;

describe("Record service", () => {
  describe("Stream", () => {
    it("Not thrown when obj store undefined", async () => {
      const deps = getRecordsService({ localOnly: true });
      // Set file doesn't exists on local
      deps.cooker.exists(Arg.all()).returns(false);
      await expect(
        deps.rServ.stream(SAMPLE_RECORD_ID, Substitute.for<ICookingOptions>())
      ).resolves.not.toThrow();
    });
  });

  describe("Download from remote", () => {
    it("Throw when obj store undefined", async () => {
      const deps = getRecordsService({ localOnly: true });
      await expect(
        deps.rServ.downloadFromRemote(SAMPLE_RECORD_ID, tmpdir())
      ).rejects.toThrow(RecordError);
    });
    it("Throw RecordError when no file on remote", async () => {
      const deps = getRecordsService();
      // Override obj store list method to return an empty array
      // @ts-ignore
      deps.objStore.list(Arg.all()).resolves({ Contents: [] });

      await expect(
        deps.rServ.downloadFromRemote(SAMPLE_RECORD_ID, tmpdir())
      ).rejects.toThrow(RecordError);
    });
    it("Throw RecordError when no file on remote", async () => {
      const deps = getRecordsService();
      // Override obj store list method to return a single file
      // @ts-ignore
      deps.objStore.list(Arg.all()).resolves({ Contents: [{ Key: "1" }] });
      // Override retrieve to return a sample file content
      const map = new Map<string, Buffer>();
      map.set("sample", Buffer.from("content"));
      deps.objStore.retrieve(Arg.all()).resolves(map);

      await expect(
        deps.rServ.downloadFromRemote(SAMPLE_RECORD_ID, tmpdir())
      ).resolves.not.toThrow();
    });
  });

  describe("Exists", () => {
    it("Not thrown when obj store undefined", async () => {
      const deps = getRecordsService({ localOnly: true });
      await expect(deps.rServ.exists(SAMPLE_RECORD_ID)).resolves.not.toThrow();
    });
    it("on local only -> true", async () => {
      const deps = getRecordsService({ localOnly: true });
      // Set file exists on local
      deps.cooker.exists(Arg.all()).returns(true);
      await expect(deps.rServ.exists(SAMPLE_RECORD_ID)).resolves.toEqual(true);
    });
    it("on remote only -> true", async () => {
      const deps = getRecordsService();
      // File doesn't exist on local
      deps.cooker.exists(Arg.all()).returns(false);
      //But is on remote
      deps.objStore
        .list(Arg.all())
        // @ts-ignore
        .resolves({ Contents: [{ Key: SAMPLE_RECORD_ID }] });
      await expect(deps.rServ.exists(SAMPLE_RECORD_ID)).resolves.toEqual(true);
    });
    it("on neither -> false", async () => {
      const deps = getRecordsService();
      // File doesn't exist on local
      deps.cooker.exists(Arg.all()).returns(false);
      // and neither on remote
      // @ts-ignore
      deps.objStore.list(Arg.all()).resolves({ Contents: [] });
      await expect(deps.rServ.exists(SAMPLE_RECORD_ID)).resolves.toEqual(false);
    });
  });

  it("Get metadata not throw", () => {
    const deps = getRecordsService();
    expect(
      deps.rServ.getMetadata({
        dynaudnorm: false,
        container: ALLOWED_CONTAINERS.MIX,
        format: ALLOWED_FORMATS.COPY,
      })
    ).not.toThrow();
  });

  describe("Delete", () => {
    it("Not thrown when obj store undefined", async () => {
      const deps = getRecordsService({ localOnly: true });
      await expect(deps.rServ.delete(SAMPLE_RECORD_ID)).resolves.not.toThrow();
    });
    it("local ok, try on remote -> true", async () => {
      const deps = getRecordsService();
      // Force local deletion to return true
      deps.cooker.delete(Arg.all()).returns(true);

      // Make fake remote deletion work
      deps.objStore
        .list(Arg.all())
        // @ts-ignore
        .resolves({ Contents: [{ Key: SAMPLE_RECORD_ID }] });

      await expect(deps.rServ.delete(SAMPLE_RECORD_ID)).resolves.toEqual(true);
    });
    it("local ko, abort -> false", async () => {
      const deps = getRecordsService();
      // Force local deletion to return true
      deps.cooker.delete(Arg.all()).returns(false);

      // Make fake remote deletion work
      deps.objStore
        .list(Arg.all())
        // @ts-ignore
        .resolves({ Contents: [{ Key: SAMPLE_RECORD_ID }] });

      await expect(deps.rServ.delete(SAMPLE_RECORD_ID)).resolves.toEqual(false);
    });
  });
});

interface IRecordServOpt {
  /** Whether to initialize remote storage */
  localOnly: boolean;
}
interface IRecordServDeps {
  rServ: RecordsService;
  objStore: SubstituteOf<IObjectStore>;
  cooker: SubstituteOf<ICooking>;
}
function getRecordsService(
  opt: IRecordServOpt = { localOnly: false }
): IRecordServDeps {
  const cooker = Substitute.for<ICooking>();
  let objStore = undefined;
  if (!opt.localOnly) objStore = Substitute.for<IObjectStore>();
  return {
    cooker,
    objStore,
    rServ: new RecordsService(objStore, cooker),
  };
}
