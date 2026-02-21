import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribeRoutes } from "@/features/transcribe/route";
import { transcribeAudioResponseSchema } from "@/features/transcribe/schema";
import {
  ConfigurationError,
  UpstreamRequestError,
} from "@/shared/errors/app-error";
import { Result } from "@/shared/result";
import {
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
} from "@/shared/schemas/api-response";

const mocks = vi.hoisted(() => ({
  transcribeAudioUrl: vi.fn(),
}));

vi.mock("@/features/transcribe/service", () => ({
  transcribeAudioUrl: mocks.transcribeAudioUrl,
}));

const transcribeResponseSchema = apiSuccessResponseSchema(transcribeAudioResponseSchema);

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
    expect(body.error).toBeNull();
    expect(body.data.text).toBe("hello world");
    expect(body.data.segments[0]?.confidence).toBe(0.99);
    expect(body.data.duration).toBe(62);
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
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Server configuration error");
    expect(body.error.code).toBe("ConfigurationError");
  });

  it("maps upstream transcription errors to 502 envelope", async () => {
    const app = createTestApp();
    mocks.transcribeAudioUrl.mockResolvedValue(
      Result.err(
        new UpstreamRequestError({
          service: "WorkersAi",
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
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Upstream request failed");
    expect(body.error.code).toBe("UpstreamRequestError");
  });

});
