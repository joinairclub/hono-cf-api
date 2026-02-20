import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkersAiRequestError } from "../../integrations/workers-ai/errors";
import { ConfigurationError } from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import { TranscribeUpstreamError } from "./errors";

const mocks = vi.hoisted(() => ({
  transcribeWithWorkersAi: vi.fn(),
}));

vi.mock("../../integrations/workers-ai/client", () => ({
  transcribeWithWorkersAi: mocks.transcribeWithWorkersAi,
}));

import { transcribeAudioUrl } from "./service";

const baseEnv = {
  AI: {
    run: vi.fn(),
  },
  HYPERDRIVE: {
    connectionString: "postgresql://example",
  },
  TIKHUB_API_TOKEN: "test-token",
} as unknown as Env;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transcribeWithWorkersAi.mockResolvedValue(
    Result.ok({
      text: "hello world",
      segments: [
        {
          text: "hello",
          start: 100,
          end: 350,
          confidence: 0.99,
        },
      ],
      language: "en",
      duration: 62,
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("transcribe service", () => {
  it("transcribes audio url", async () => {
    const result = await transcribeAudioUrl({
      env: baseEnv,
      audioUrl: "https://cdn.example.com/audio.mp3",
    });

    Result.match(result, {
      ok: (value) => {
        expect(value.text).toBe("hello world");
      },
      err: (error) => {
        throw new Error(`Expected success, got ${error._tag}`);
      },
    });

    expect(mocks.transcribeWithWorkersAi).toHaveBeenCalledTimes(1);
    expect(mocks.transcribeWithWorkersAi).toHaveBeenCalledWith(
      expect.objectContaining({
        audioUrl: "https://cdn.example.com/audio.mp3",
        ai: baseEnv.AI,
      }),
    );
  });

  it("accepts tiktok platform urls at service boundary", async () => {
    const result = await transcribeAudioUrl({
      env: baseEnv,
      audioUrl: "https://www.tiktok.com/@travelwithjustjess/video/7556608260934061342",
    });

    Result.match(result, {
      ok: (value) => {
        expect(value.text).toBe("hello world");
      },
      err: (error) => {
        throw new Error(`Expected success, got ${error._tag}`);
      },
    });
  });

  it("normalizes integration errors to TranscribeUpstreamError", async () => {
    mocks.transcribeWithWorkersAi.mockResolvedValue(
      Result.err(
        new WorkersAiRequestError({
          cause: new Error("network"),
        }),
      ),
    );

    const result = await transcribeAudioUrl({
      env: baseEnv,
      audioUrl: "https://cdn.example.com/audio.mp3",
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected TranscribeUpstreamError");
      },
      err: (error) => {
        expect(TranscribeUpstreamError.is(error)).toBe(true);
        if (TranscribeUpstreamError.is(error)) {
          expect(error.provider).toBe("workers-ai");
          expect(error.kind).toBe("request");
        }
      },
    });
  });

  it("returns ConfigurationError when AI binding is missing", async () => {
    const envWithoutAi = {
      HYPERDRIVE: {
        connectionString: "postgresql://example",
      },
      TIKHUB_API_TOKEN: "test-token",
    } as unknown as Env;

    const result = await transcribeAudioUrl({
      env: envWithoutAi,
      audioUrl: "https://cdn.example.com/audio.mp3",
    });

    Result.match(result, {
      ok: () => {
        throw new Error("Expected ConfigurationError");
      },
      err: (error) => {
        expect(ConfigurationError.is(error)).toBe(true);
      },
    });

    expect(mocks.transcribeWithWorkersAi).not.toHaveBeenCalled();
  });

});
