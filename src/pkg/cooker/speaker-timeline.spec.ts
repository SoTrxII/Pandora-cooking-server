import { parseUsers, toIntervals } from "./speaker-timeline";

describe("Speaker timeline", () => {
  describe("parseUsers", () => {
    it("should parse Pandora's brace-less roster", () => {
      // This is the literal on-disk shape: the inside of an object, appended
      // one line per joiner, with no enclosing braces.
      const raw = `"0":{}
,"1":{"id":"188626510901542912","name":"shrecki","discrim":"0"}
,"2":{"id":"155371393297416193","name":"frozegg","discrim":"0"}`;

      const users = parseUsers(raw);

      expect(users.size).toBe(2);
      expect(users.get(1)).toEqual({
        id: "188626510901542912",
        name: "shrecki",
      });
      expect(users.get(2).name).toBe("frozegg");
    });

    it("should not treat index 0 as a person", () => {
      // Index 0 is a placeholder with no id, present in every roster.
      expect(parseUsers(`"0":{}`).has(0)).toBe(false);
    });

    it("should degrade to empty rather than throw on a malformed roster", () => {
      // Older archived recordings have no roster at all. Absence has to mean
      // "unknown", never "nobody was there".
      expect(parseUsers("").size).toBe(0);
      expect(parseUsers("not json at all").size).toBe(0);
    });
  });

  describe("toIntervals", () => {
    const SECOND = 48000;

    it("should return nothing for a track that never transmitted", () => {
      expect(toIntervals([])).toEqual([]);
    });

    it("should merge packets separated by less than the turn gap", () => {
      // Discord emits a 20ms frame per packet while transmitting, so a
      // continuous utterance arrives as many closely-spaced granules.
      const granules = [0, 0.02, 0.04, 0.06].map((s) => s * SECOND);

      const intervals = toIntervals(granules);

      expect(intervals).toHaveLength(1);
      expect(intervals[0].start).toBeCloseTo(0);
      expect(intervals[0].end).toBeCloseTo(0.06);
    });

    it("should split on a silence longer than the turn gap", () => {
      const granules = [0, 1, 10, 11].map((s) => s * SECOND);

      const intervals = toIntervals(granules);

      expect(intervals).toHaveLength(2);
      expect(intervals[0]).toEqual({ start: 0, end: 1 });
      expect(intervals[1]).toEqual({ start: 10, end: 11 });
    });

    it("should convert granule positions to seconds at 48kHz", () => {
      // Validated against cook/oggduration, which is granule/48000 + 2.
      expect(toIntervals([498.725417 * SECOND])[0].start).toBeCloseTo(
        498.725417
      );
    });

    it("should tolerate granules arriving out of order", () => {
      // Pages are read in file order, which interleaves streams; nothing
      // guarantees a single stream's granules are monotonic in that walk.
      const intervals = toIntervals([11, 0, 1, 10].map((s) => s * SECOND));

      expect(intervals).toEqual([
        { start: 0, end: 1 },
        { start: 10, end: 11 },
      ]);
    });
  });
});
