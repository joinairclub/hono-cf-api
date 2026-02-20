import { afterEach, describe, expect, it, vi } from "vitest";
import { Result } from "../../shared/result";
import { transcribeWithWorkersAi } from "./client";
import { WorkersAiRequestError, WorkersAiResponseError } from "./errors";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("workers ai transcription client", () => {
  it("transcribes an audio url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "audio/mpeg" },
      }),
    );

    const run = vi.fn().mockResolvedValue({
      text: "hello world",
      transcription_info: {
        language: "en",
        duration: 2.3,
      },
      segments: [
        {
          words: [
            {
              word: "hello",
              start: 0,
              end: 0.4,
            },
            {
              word: "world",
              start: 0.4,
              end: 0.8,
            },
          ],
        },
      ],
    });

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: { run } as unknown as Ai,
    });

    Result.match(result, {
      ok: (value) => {
        expect(value.text).toBe("hello world");
        expect(value.language).toBe("en");
        expect(value.duration).toBe(2.3);
        expect(value.segments).toEqual([
          {
            text: "hello",
            start: 0,
            end: 0.4,
            confidence: null,
          },
          {
            text: "world",
            start: 0.4,
            end: 0.8,
            confidence: null,
          },
        ]);
      },
      err: (error) => {
        throw new Error(`Expected success, got ${error._tag}`);
      },
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith(
      "@cf/openai/whisper-large-v3-turbo",
      expect.anything(),
    );
    const runCall = run.mock.calls[0];
    expect(runCall).toBeDefined();
    const payload = runCall[1] as { audio: unknown };
    expect(typeof payload.audio).toBe("string");
  });

  it("returns WorkersAiResponseError when audio source request is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("forbidden", {
        status: 403,
        headers: { "content-type": "text/plain" },
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: { run: vi.fn() } as unknown as Ai,
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected WorkersAiResponseError");
      },
      err: (error) => {
        expect(WorkersAiResponseError.is(error)).toBe(true);
        if (WorkersAiResponseError.is(error)) {
          expect(error.message).toContain("Audio source returned 403");
        }
      },
    });
  });

  it("returns WorkersAiRequestError when ai.run throws", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: {
        run: vi.fn().mockRejectedValue(new Error("boom")),
      } as unknown as Ai,
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected WorkersAiRequestError");
      },
      err: (error) => {
        expect(WorkersAiRequestError.is(error)).toBe(true);
      },
    });
  });

  it("returns WorkersAiResponseError for schema mismatch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: {
        run: vi.fn().mockResolvedValue({ foo: "bar" }),
      } as unknown as Ai,
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected WorkersAiResponseError");
      },
      err: (error) => {
        expect(WorkersAiResponseError.is(error)).toBe(true);
      },
    });
  });
});
