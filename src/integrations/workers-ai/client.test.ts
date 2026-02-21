import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeWithWorkersAi } from "@/integrations/workers-ai/client";
import {
  UpstreamRequestError,
  UpstreamResponseError,
} from "@/shared/errors/app-error";
import { Result } from "@/shared/result";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("workers ai transcription client", () => {
  it("transcribes an audio url", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "content-length": "3",
        },
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

  it("returns UpstreamResponseError when audio source request is not ok", async () => {
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
        throw new Error("Expected UpstreamResponseError");
      },
      err: (error) => {
        expect(UpstreamResponseError.is(error)).toBe(true);
        if (UpstreamResponseError.is(error)) {
          expect(error.service).toBe("WorkersAi");
          expect(error.message).toContain("Audio source returned 403");
        }
      },
    });
  });

  it("returns UpstreamResponseError when content-length exceeds limit", async () => {
    const run = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "content-length": String(30 * 1024 * 1024),
        },
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: { run } as unknown as Ai,
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected UpstreamResponseError");
      },
      err: (error) => {
        expect(UpstreamResponseError.is(error)).toBe(true);
        if (UpstreamResponseError.is(error)) {
          expect(error.service).toBe("WorkersAi");
          expect(error.message).toContain("Audio source is too large");
        }
      },
    });

    expect(run).not.toHaveBeenCalled();
  });

  it("returns UpstreamResponseError for invalid content-length", async () => {
    const run = vi.fn();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
          "content-length": "invalid",
        },
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: { run } as unknown as Ai,
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected UpstreamResponseError");
      },
      err: (error) => {
        expect(UpstreamResponseError.is(error)).toBe(true);
        if (UpstreamResponseError.is(error)) {
          expect(error.service).toBe("WorkersAi");
          expect(error.message).toContain("invalid content-length");
        }
      },
    });

    expect(run).not.toHaveBeenCalled();
  });

  it("returns UpstreamRequestError when ai.run throws", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-length": "3",
        },
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
        throw new Error("Expected UpstreamRequestError");
      },
      err: (error) => {
        expect(UpstreamRequestError.is(error)).toBe(true);
        if (UpstreamRequestError.is(error)) {
          expect(error.service).toBe("WorkersAi");
        }
      },
    });
  });

  it("returns UpstreamResponseError for schema mismatch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-length": "3",
        },
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
        throw new Error("Expected UpstreamResponseError");
      },
      err: (error) => {
        expect(UpstreamResponseError.is(error)).toBe(true);
        if (UpstreamResponseError.is(error)) {
          expect(error.service).toBe("WorkersAi");
        }
      },
    });
  });

  it("preserves segment-level fallback when word timings are partial", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          "content-length": "3",
        },
      }),
    );

    const result = await transcribeWithWorkersAi({
      audioUrl: "https://cdn.example.com/audio.mp3",
      ai: {
        run: vi.fn().mockResolvedValue({
          text: "alpha beta",
          transcription_info: {
            language: "en",
            duration: 2.2,
          },
          segments: [
            {
              words: [
                {
                  word: "alpha",
                  start: 0,
                  end: 0.8,
                },
              ],
            },
            {
              text: "beta",
              start: 1.1,
              end: 2.2,
            },
          ],
        }),
      } as unknown as Ai,
    });

    Result.match(result, {
      ok: (value) => {
        expect(value.segments).toEqual([
          {
            text: "alpha",
            start: 0,
            end: 0.8,
            confidence: null,
          },
          {
            text: "beta",
            start: 1.1,
            end: 2.2,
            confidence: null,
          },
        ]);
      },
      err: (error) => {
        throw new Error(`Expected success, got ${error._tag}`);
      },
    });
  });
});
