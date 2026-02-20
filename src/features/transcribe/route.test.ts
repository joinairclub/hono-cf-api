import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ConfigurationError } from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import { TranscribeUpstreamError } from "./errors";

const mocks = vi.hoisted(() => ({
  transcribeAudioUrl: vi.fn(),
}));

vi.mock("./service", () => ({
  transcribeAudioUrl: mocks.transcribeAudioUrl,
}));

import { transcribeRoutes } from "./route";

const transcribeResponseSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      text: z.string(),
      start: z.number(),
      end: z.number(),
      confidence: z.number().nullable(),
    }),
  ),
  language: z.string().nullable(),
  duration: z.number().nullable(),
});

const mockEnv = {
  AI: {
    run: vi.fn(),
  },
  HYPERDRIVE: {
    connectionString: "postgresql://example",
  },
  TIKHUB_API_TOKEN: "test-token",
} as unknown as Env;

const mockExecutionCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
  props: {},
};

const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/transcribe", transcribeRoutes);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.transcribeAudioUrl.mockResolvedValue(
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

describe("transcribe routes", () => {
  it("returns transcription payload", async () => {
    const app = createTestApp();

    const response = await app.request(
      "/api/transcribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioUrl: "https://cdn.example.com/audio.mp3",
        }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    const body = transcribeResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.text).toBe("hello world");
    expect(body.segments[0]?.confidence).toBe(0.99);
    expect(body.duration).toBe(62);
    expect(mocks.transcribeAudioUrl).toHaveBeenCalledWith({
      env: mockEnv,
      audioUrl: "https://cdn.example.com/audio.mp3",
    });
  });

  it("returns 400 for invalid payload", async () => {
    const app = createTestApp();

    const response = await app.request(
      "/api/transcribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioUrl: "not-a-url",
        }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(400);
    expect(mocks.transcribeAudioUrl).not.toHaveBeenCalled();
  });

  it("accepts platform urls without request-level rejection", async () => {
    const app = createTestApp();

    const response = await app.request(
      "/api/transcribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioUrl: "https://www.tiktok.com/@travelwithjustjess/video/7556608260934061342",
        }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(200);
    expect(mocks.transcribeAudioUrl).toHaveBeenCalledWith({
      env: mockEnv,
      audioUrl: "https://www.tiktok.com/@travelwithjustjess/video/7556608260934061342",
    });
  });

  it("maps configuration errors to 500 envelope", async () => {
    const app = createTestApp();
    mocks.transcribeAudioUrl.mockResolvedValue(
      Result.err(
        new ConfigurationError({
          message: "Missing required binding: AI",
        }),
      ),
    );

    const response = await app.request(
      "/api/transcribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioUrl: "https://cdn.example.com/audio.mp3",
        }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      data: null,
      error: {
        message: "Server configuration error",
        code: "ConfigurationError",
      },
    });
  });

  it("maps upstream transcription errors to 502 envelope", async () => {
    const app = createTestApp();
    mocks.transcribeAudioUrl.mockResolvedValue(
      Result.err(
        new TranscribeUpstreamError({
          provider: "workers-ai",
          kind: "request",
          message: "Workers AI request failed: network",
          cause: new Error("network"),
        }),
      ),
    );

    const response = await app.request(
      "/api/transcribe",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioUrl: "https://cdn.example.com/audio.mp3",
        }),
      },
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      data: null,
      error: {
        message: "Upstream transcription failed",
        code: "TranscribeUpstreamError",
      },
    });
  });

});
