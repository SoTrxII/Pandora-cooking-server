import { createReadStream } from "fs";
import { execFileSync } from "child_process";
import { readFile } from "fs/promises";
import { join, resolve } from "path";

/**
 * Who was speaking, when — recovered from the raw Craig/Pandora recording.
 *
 * Discord sends voice packets only while someone is actually transmitting, and
 * Craig writes each participant to their own ogg stream, so the pages already
 * encode a per-person speaking timeline. Reading it costs a walk over the page
 * headers: no decoding, no ffmpeg, no diarization, and no guessing.
 *
 * This matters because the mixed `.ogg` we hand to whisper throws that identity
 * away, and whisper's diarization only recovers anonymous clusters
 * (SPEAKER_00...) that nothing can join back to a Discord account. The raw
 * record can, and it is the only place the mapping survives — records are
 * deleted shortly after cooking, so the timeline has to be captured then.
 */

/**
 * Opus in Discord is always 48kHz, and granule positions are sample counts.
 *
 * Verified against cook/oggduration on record 872660673: it reports 500.725417s
 * and this walk puts the last granule at 498.725417s. The difference is exactly
 * the `+2` tail pad hardcoded at oggduration.c:107, not drift — the fractional
 * parts match to the digit.
 */
const OPUS_SAMPLE_RATE = 48000;

/**
 * Silence longer than this ends a speaking interval.
 *
 * Discord emits a 20ms Opus frame per packet while a user transmits, so any gap
 * is silence; the threshold only decides how aggressively adjacent utterances
 * are merged. Two seconds keeps a normal breath or beat inside one interval
 * while still splitting genuinely separate turns — and the consumer aligns
 * whisper segments by overlap, which tolerates generous intervals far better
 * than fragmented ones.
 */
const TURN_GAP_SECONDS = 2.0;

/** "OggS" + version. */
const PRE_HEADER_BYTES = 5;
/** type + granulePos + streamNo + sequenceNo + crc, packed. */
const HEADER_BYTES = 21;
/** The byte holding how many segment-table entries follow. */
const SEGMENT_COUNT_BYTES = 1;
const PAGE_FIXED_BYTES = PRE_HEADER_BYTES + HEADER_BYTES + SEGMENT_COUNT_BYTES;

export interface ISpeakingInterval {
  /** Seconds from the start of the recording. */
  start: number;
  end: number;
}

export interface ISpeakerTrack {
  /** 1-based track number — the same key cook.sh uses against the .users file. */
  track: number;
  /** Discord snowflake, when the roster knows this track. */
  userId?: string;
  username?: string;
  intervals: ISpeakingInterval[];
  /** Total time transmitting. The GM is usually, but not reliably, the largest. */
  speakingSeconds: number;
}

export interface ISpeakerTimeline {
  recordId: number;
  tracks: ISpeakerTrack[];
}

/**
 * Parse Pandora's `.users` sidecar.
 *
 * It is not valid JSON on its own: it is the inside of an object, appended one
 * line per joiner, so it has to be wrapped before parsing. Index "0" is a
 * placeholder with no id and is never a person.
 */
export function parseUsers(
  raw: string
): Map<number, { id: string; name: string }> {
  const users = new Map<number, { id: string; name: string }>();
  let parsed: Record<string, { id?: string; name?: string }>;
  try {
    parsed = JSON.parse(`{${raw.trim()}}`);
  } catch {
    return users;
  }
  for (const [index, user] of Object.entries(parsed)) {
    if (!user?.id) continue;
    users.set(Number(index), { id: user.id, name: user.name ?? "" });
  }
  return users;
}

/**
 * Group ascending granule positions into speaking intervals.
 *
 * Exported for tests: this is the only part with a tunable in it.
 */
export function toIntervals(granules: number[]): ISpeakingInterval[] {
  if (granules.length === 0) return [];
  const times = granules
    .map((g) => g / OPUS_SAMPLE_RATE)
    .sort((a, b) => a - b);

  const intervals: ISpeakingInterval[] = [];
  let start = times[0];
  let previous = times[0];
  for (const time of times) {
    if (time - previous > TURN_GAP_SECONDS) {
      intervals.push({ start, end: previous });
      start = time;
    }
    previous = time;
  }
  intervals.push({ start, end: previous });
  return intervals;
}

/**
 * Ogg stream numbers, in track order.
 *
 * cook.sh derives its track numbering the same way (`oggtracks -n` over
 * header1, then `seq 1 NB_STREAMS`), so reusing the binary keeps this in step
 * with the filenames the zip container produces rather than re-deriving an
 * ordering that could drift from it.
 */
function streamOrder(scriptBase: string, headerPath: string): number[] {
  const out = execFileSync(
    resolve(scriptBase, "./cook/oggtracks"),
    ["-n"],
    { input: require("fs").readFileSync(headerPath), encoding: "utf-8" }
  );
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(Number);
}

/** Walk the page headers of a `.ogg.data`, collecting granule positions per stream. */
function collectGranules(dataPath: string): Promise<Map<number, number[]>> {
  return new Promise((done, fail) => {
    const perStream = new Map<number, number[]>();
    let buffer = Buffer.alloc(0);
    const stream = createReadStream(dataPath);

    stream.on("data", (chunk: Buffer) => {
      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
      let offset = 0;

      for (;;) {
        if (buffer.length - offset < PAGE_FIXED_BYTES) break;
        if (buffer.toString("latin1", offset, offset + 4) !== "OggS") {
          // Not a page boundary: the file is truncated or corrupt past here.
          // Craig writes pages back to back, so there is nothing to resync to.
          stream.destroy();
          return;
        }

        const segmentCount = buffer.readUInt8(
          offset + PRE_HEADER_BYTES + HEADER_BYTES
        );
        const pageBytes = PAGE_FIXED_BYTES + segmentCount;
        if (buffer.length - offset < pageBytes) break;

        let payloadBytes = 0;
        for (let i = 0; i < segmentCount; i++) {
          payloadBytes += buffer.readUInt8(offset + PAGE_FIXED_BYTES + i);
        }
        if (buffer.length - offset < pageBytes + payloadBytes) break;

        // Packed struct: type(1) then granulePos, so granule starts right after
        // the 5-byte pre-header plus that one byte.
        const granule = buffer.readBigUInt64LE(offset + PRE_HEADER_BYTES + 1);
        const streamNo = buffer.readUInt32LE(offset + PRE_HEADER_BYTES + 9);

        const seen = perStream.get(streamNo);
        if (seen) seen.push(Number(granule));
        else perStream.set(streamNo, [Number(granule)]);

        offset += pageBytes + payloadBytes;
      }

      buffer = buffer.subarray(offset);
    });

    stream.on("close", () => done(perStream));
    stream.on("error", fail);
  });
}

/**
 * Build the speaker timeline for a raw record.
 *
 * @param recordingsDir where the raw `.ogg.*` files live
 * @param scriptBase    directory holding `cook/oggtracks`
 */
export async function extractSpeakerTimeline(
  recordingsDir: string,
  scriptBase: string,
  id: number
): Promise<ISpeakerTimeline> {
  const base = join(recordingsDir, String(id));
  const users = parseUsers(
    await readFile(`${base}.ogg.users`, { encoding: "utf-8" })
  );
  const order = streamOrder(scriptBase, `${base}.ogg.header1`);
  const granules = await collectGranules(`${base}.ogg.data`);

  const tracks: ISpeakerTrack[] = order.map((streamNo, position) => {
    // cook.sh numbers tracks from 1, and that number is the .users key.
    const track = position + 1;
    const intervals = toIntervals(granules.get(streamNo) ?? []);
    const user = users.get(track);
    return {
      track,
      userId: user?.id,
      username: user?.name,
      intervals,
      speakingSeconds: intervals.reduce((t, i) => t + (i.end - i.start), 0),
    };
  });

  return { recordId: id, tracks };
}
