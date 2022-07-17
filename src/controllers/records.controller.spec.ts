import "reflect-metadata";
import { RecordsController } from "./records.controller";
import { Arg, Substitute } from "@fluffy-spoon/substitute";
import { ILogger } from "../pkg/logger/logger-api";
import { IRecordsService } from "../services/records/records.service.api";
import { Request, Response } from "express";
import { CookerOptionsInvalidError } from "../pkg/cooker/cook";

describe("Records Controller", () => {
  describe("Get", () => {
    it("Invalid record arg", async () => {
      const ctrl = getMockService();
      const reqP = prepareRequest({ id: "dhdhd" });
      await ctrl.get(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(404);
    });
    it("Valid record arg", async () => {
      const ctrl = getMockService();
      const reqP = prepareRequest({ id: "1" });
      await ctrl.get(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(200);
    });
    it("Format error", async () => {
      const ctrl = getMockService({
        metadataError: new CookerOptionsInvalidError(),
      });
      const reqP = prepareRequest({ id: "1" });
      await ctrl.get(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(422);
    });
    it("Unexpected error", async () => {
      const ctrl = getMockService({
        metadataError: new Error(),
      });
      const reqP = prepareRequest({ id: "1" });
      await ctrl.get(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(500);
    });
  });
  describe("Delete", () => {
    it("Invalid record arg", async () => {
      const ctrl = getMockService();
      const reqP = prepareRequest({ id: "dhdhd" });
      await ctrl.delete(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(404);
    });
    it("Valid record arg", async () => {
      const ctrl = getMockService();
      const reqP = prepareRequest({ id: "1" });
      await ctrl.delete(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(200);
    });
    it("Could not delete", async () => {
      const ctrl = getMockService({
        deleteReturn: false,
      });
      const reqP = prepareRequest({ id: "1" });
      await ctrl.delete(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(403);
    });
    it("Valid record arg", async () => {
      const ctrl = getMockService({
        deleteReturn: new Error(),
      });
      const reqP = prepareRequest({ id: "1" });
      await ctrl.delete(reqP.req, reqP.res);
      expect(reqP.returnObj.rCode).toEqual(500);
    });
  });

  describe("Format name", () => {
    it("Valid record metadata", () => {
      const ctrl = getMockService();
      const startTime = String(new Date().getTime());
      const rId = 1;
      const ext = ".test";
      const channel = "testChannel";
      const name = ctrl.formatFileName(rId, ext, {
        channel,
        guild: "testGuild",
        requester: "testRequester",
        requesterId: "1",
        startTime,
      });
      expect(name).toEqual(`${startTime}-${channel}-${rId}${ext}`);
    });
    it("Way too long channel name must be truncated", () => {
      const FILENAME_LIMIT = 255;
      const ctrl = getMockService();
      const startTime = String(new Date().getTime());
      const rId = 1;
      const ext = ".test";
      const channel = "testChannel".repeat(100);
      const name = ctrl.formatFileName(rId, ext, {
        channel,
        guild: "testGuild",
        requester: "testRequester",
        requesterId: "1",
        startTime,
      });
      expect(name.length).toBeLessThan(FILENAME_LIMIT);
    });

    it("Pandora v1 naming", () => {
      const ctrl = getMockService();
      const startTimeOldFormat = new Date().toUTCString();
      const startTime = String(new Date(startTimeOldFormat).getTime());
      const rId = 1;
      const ext = ".test";
      const channelOldFormat = "test#1111";
      const channel = "test";
      const name = ctrl.formatFileName(rId, ext, {
        channel: channelOldFormat,
        guild: "testGuild",
        requester: "testRequester",
        requesterId: "1",
        startTime: startTimeOldFormat,
      });
      expect(name).toEqual(`${startTime}-${channel}-${rId}${ext}`);
    });
    it("No record metadata", () => {
      const ctrl = getMockService();
      const rId = 1;
      const ext = ".test";
      const name = ctrl.formatFileName(rId, ext, {});
      expect(name).toEqual(`${rId}${ext}`);
    });
  });
});

function prepareRequest(params: Record<string, unknown>) {
  const req = Substitute.for<Request>();
  req.params.returns(params);
  const res = Substitute.for<Response>();
  // Object are passed by ref in JS, but plain types are passes as values
  // Wrapping the object this way will allow for changes to rCode to be reflected
  const ret = {
    rCode: 200,
  };
  res.status.returns((code) => {
    ret.rCode = code;
  });
  return { req: req, res: res, returnObj: ret };
}

function getMockService(
  err?: Partial<{
    metadataError: Error;
    deleteReturn: Error | boolean;
  }>
) {
  const rService = Substitute.for<IRecordsService>();
  if (err?.metadataError)
    rService.getMetadata(Arg.all()).throws(err?.metadataError);

  if (err?.deleteReturn !== undefined) {
    if (err?.deleteReturn instanceof Error)
      rService.delete(Arg.all()).throws(err?.deleteReturn);
    else rService.delete(Arg.all()).returns(Promise.resolve(err?.deleteReturn));
  }

  return new RecordsController(rService, Substitute.for<ILogger>());
}
