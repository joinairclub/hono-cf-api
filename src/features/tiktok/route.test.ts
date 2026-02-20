import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tiktokDownloadRoutes } from "./route";

const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/tiktok", tiktokDownloadRoutes);
  return app;
};

const mockEnv = {
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tiktok routes", () => {
  it("returns resolved download payload from tikhub", async () => {
    const app = createTestApp();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            aweme_details: [
              {
                aweme_id: "7551026080430181662",
                video: {
                  download_no_watermark_addr: {
                    url_list: ["https://cdn.example/video.mp4"],
                  },
                },
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const response = await app.request(
      "/api/tiktok/download?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );
    const body = (await response.json()) as {
      data: {
        provider: string;
        source: string;
        shareUrl: string;
        videoId: string;
        downloadUrl: string;
        status: string;
      };
      error: null;
    };

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.provider).toBe("tiktok");
    expect(body.data.source).toBe("tikhub");
    expect(body.data.downloadUrl).toBe("https://cdn.example/video.mp4");
    expect(body.data.status).toBe("resolved");
    expect(body.data.videoId).toBe("7551026080430181662");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns tiktok metadata payload from tikhub", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            aweme_detail: {
              aweme_id: "7551026080430181662",
              desc: "Charlotte to NYC #travelhacks #familyvacation",
              create_time: 1758110287,
              cha_list: [{ cha_name: "travelhacks" }, { cha_name: "familyvacation" }],
              author: {
                uid: "7540261131874796558",
                unique_id: "travelwithjustjess",
                nickname: "Just Jess",
              },
              statistics: {
                play_count: 835,
                digg_count: 44,
                comment_count: 2,
                share_count: 3,
              },
              video: {
                duration: 26267,
                download_no_watermark_addr: {
                  url_list: ["https://cdn.example/no-watermark.mp4"],
                  width: 576,
                  height: 1024,
                },
                play_addr: {
                  url_list: ["https://cdn.example/play-default.mp4"],
                  width: 576,
                  height: 1024,
                },
                origin_cover: {
                  url_list: ["https://cdn.example/thumb.jpg"],
                },
                bit_rate: [
                  {
                    bit_rate: 342065,
                    quality_type: 14,
                    play_addr: {
                      url_list: ["https://cdn.example/720.mp4"],
                      width: 720,
                      height: 1280,
                    },
                  },
                  {
                    bit_rate: 601204,
                    quality_type: 2,
                    play_addr: {
                      url_list: ["https://cdn.example/1080.mp4"],
                      width: 1080,
                      height: 1920,
                    },
                  },
                ],
              },
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const response = await app.request(
      "/api/tiktok/info?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );
    const body = (await response.json()) as {
      data: {
        provider: string;
        status: string;
        video: {
          id: string;
          description: string;
          durationMs: number;
          createdAt: string;
          hashtags: string[];
          author: {
            userId: string;
            username: string;
            nickname: string;
          };
          stats: {
            playCount: number;
            likeCount: number;
            commentCount: number;
            shareCount: number;
          };
          thumbnailUrl: string;
          downloadUrl: string;
        };
      };
      error: null;
    };

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.provider).toBe("tiktok");
    expect(body.data.status).toBe("resolved");
    expect(body.data.video.id).toBe("7551026080430181662");
    expect(body.data.video.description).toBe("Charlotte to NYC #travelhacks #familyvacation");
    expect(body.data.video.durationMs).toBe(26267);
    expect(body.data.video.createdAt).toBe("2025-09-17T11:58:07.000Z");
    expect(body.data.video.hashtags).toEqual(["travelhacks", "familyvacation"]);
    expect(body.data.video.author).toEqual({
      userId: "7540261131874796558",
      username: "travelwithjustjess",
      nickname: "Just Jess",
    });
    expect(body.data.video.stats).toEqual({
      playCount: 835,
      likeCount: 44,
      commentCount: 2,
      shareCount: 3,
    });
    expect(body.data.video.thumbnailUrl).toBe("https://cdn.example/thumb.jpg");
    expect(body.data.video.downloadUrl).toBe("https://cdn.example/no-watermark.mp4");
  });

  it("returns 400 for non-tiktok share url", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/tiktok/download?share_url=https://example.com/video/123",
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when tikhub token is missing", async () => {
    const app = createTestApp();
    const envWithoutToken = {
      HYPERDRIVE: {
        connectionString: "postgresql://example",
      },
    } as unknown as Env;

    const response = await app.request(
      "/api/tiktok/download?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662",
      undefined,
      envWithoutToken,
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
});
