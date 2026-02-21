import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tiktokProfileResultSchema } from "@/features/tiktok/profile/schema";
import { tiktokRoutes } from "@/features/tiktok/route";
import { tiktokInfoResultSchema } from "@/features/tiktok/video/schema";
import {
  apiErrorResponseSchema,
  apiSuccessResponseSchema,
} from "@/shared/schemas/api-response";

const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/tiktok", tiktokRoutes);
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

const tiktokInfoResponseSchema = apiSuccessResponseSchema(tiktokInfoResultSchema);
const tiktokProfileResponseSchema = apiSuccessResponseSchema(tiktokProfileResultSchema);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tiktok routes", () => {
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
              music: {
                play_url: {
                  url_list: ["https://cdn.example/audio.mp3"],
                },
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
    const body = tiktokInfoResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
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
    expect(body.data.video.audioUrl).toBe("https://cdn.example/audio.mp3");
    expect(body.data.video.downloadUrl).toBe("https://cdn.example/no-watermark.mp4");
  });

  it("returns tiktok profile payload from tikhub", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            userInfo: {
              user: {
                id: "107955",
                uniqueId: "tiktok",
                secUid: "MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
                nickname: "TikTok",
                verified: true,
                signature: "One TikTok can make a big impact",
                createTime: 1425144149,
                avatarThumb: "https://cdn.example/thumb.jpg",
                avatarMedium: "https://cdn.example/medium.jpg",
                avatarLarger: "https://cdn.example/large.jpg",
                bioLink: {
                  link: "linktr.ee/tiktok",
                },
                commerceUserInfo: {
                  category: "Media & Entertainment",
                },
              },
              stats: {
                followerCount: 93000000,
                followingCount: 5,
                heartCount: 454400000,
                videoCount: 1391,
                friendCount: 3,
              },
              statsV2: {
                followerCount: "93010642",
                followingCount: "5",
                heartCount: "454446280",
                videoCount: "1391",
                friendCount: "3",
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
      "/api/tiktok/profile?username=@tiktok",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );
    const body = tiktokProfileResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.username).toBe("tiktok");
    expect(body.data.profile.userId).toBe("107955");
    expect(body.data.profile.username).toBe("tiktok");
    expect(body.data.profile.secUserId).toBe(
      "MS4wLjABAAAAv7iSuuXDJGDvJkmH_vz1qkDZYo1apxgzaxdBSeIuPiM",
    );
    expect(body.data.profile.nickname).toBe("TikTok");
    expect(body.data.profile.verified).toBe(true);
    expect(body.data.profile.avatarThumbUrl).toBe("https://cdn.example/thumb.jpg");
    expect(body.data.profile.bio).toBe("One TikTok can make a big impact");
    expect(body.data.profile.bioLink).toBe("linktr.ee/tiktok");
    expect(body.data.profile.category).toBe("Media & Entertainment");
    expect(body.data.profile.createdTime).toBe(1425144149);
    expect(body.data.profile.createdAt).toBe("2015-02-28T17:22:29.000Z");
    expect(body.data.profile.stats).toEqual({
      followerCount: 93010642,
      followingCount: 5,
      likeCount: 454446280,
      videoCount: 1391,
      friendCount: 3,
    });
  });

  it("handles empty optional profile fields from tikhub", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            userInfo: {
              user: {
                id: "107955",
                uniqueId: "tiktok",
                secUid: "",
                nickname: "TikTok",
                verified: "",
                signature: "",
                createTime: "",
                avatarThumb: "",
                avatarMedium: "",
                avatarLarger: "",
                bioLink: {
                  link: "",
                },
                commerceUserInfo: {
                  category: "",
                },
              },
              stats: {
                followerCount: "",
                followingCount: "",
                heartCount: "",
                videoCount: "",
                friendCount: "",
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
      "/api/tiktok/profile?username=@tiktok",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );
    const body = tiktokProfileResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.username).toBe("tiktok");
    expect(body.data.profile.secUserId).toBeNull();
    expect(body.data.profile.verified).toBeNull();
    expect(body.data.profile.bio).toBeNull();
    expect(body.data.profile.bioLink).toBeNull();
    expect(body.data.profile.category).toBeNull();
    expect(body.data.profile.createdTime).toBeNull();
    expect(body.data.profile.stats).toEqual({
      followerCount: null,
      followingCount: null,
      likeCount: null,
      videoCount: null,
      friendCount: null,
    });
  });

  it("returns 400 for non-tiktok share url", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/tiktok/info?share_url=https://example.com/video/123",
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
      "/api/tiktok/info?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662",
      undefined,
      envWithoutToken,
      mockExecutionCtx,
    );

    expect(response.status).toBe(500);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Server configuration error");
    expect(body.error.code).toBe("ConfigurationError");
  });

  it("returns 500 when tikhub token is missing for profile", async () => {
    const app = createTestApp();
    const envWithoutToken = {
      HYPERDRIVE: {
        connectionString: "postgresql://example",
      },
    } as unknown as Env;

    const response = await app.request(
      "/api/tiktok/profile?username=tiktok",
      undefined,
      envWithoutToken,
      mockExecutionCtx,
    );

    expect(response.status).toBe(500);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Server configuration error");
    expect(body.error.code).toBe("ConfigurationError");
  });

  it("returns 400 for empty username", async () => {
    const app = createTestApp();
    const response = await app.request("/api/tiktok/profile?username=");
    expect(response.status).toBe(400);
  });

  it("returns 400 for whitespace-only username", async () => {
    const app = createTestApp();
    const response = await app.request("/api/tiktok/profile?username=%20%20");
    expect(response.status).toBe(400);
  });

  it("returns 400 for username exceeding 64 characters", async () => {
    const app = createTestApp();
    const longUsername = "a".repeat(65);
    const response = await app.request(`/api/tiktok/profile?username=${longUsername}`);
    expect(response.status).toBe(400);
  });

  it("returns 400 for username with invalid characters", async () => {
    const app = createTestApp();
    const response = await app.request("/api/tiktok/profile?username=user%20name!");
    expect(response.status).toBe(400);
  });

  it("returns 502 when tikhub returns non-200 for video", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Rate limited", { status: 429 }),
    );

    const response = await app.request(
      "/api/tiktok/info?share_url=https://www.tiktok.com/@user/video/123",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("UpstreamResponseError");
  });

  it("returns 502 when tikhub returns malformed json", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json {{{", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await app.request(
      "/api/tiktok/info?share_url=https://www.tiktok.com/@user/video/123",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("UpstreamRequestError");
  });

  it("returns 502 when tikhub response has no download url", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            aweme_detail: {
              aweme_id: "123",
              desc: "test",
              video: {},
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
      "/api/tiktok/info?share_url=https://www.tiktok.com/@user/video/123",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("UpstreamResponseError");
  });

  it("returns 502 when tikhub returns non-200 for profile", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 }),
    );

    const response = await app.request(
      "/api/tiktok/profile?username=tiktok",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("UpstreamResponseError");
  });

  it("returns 502 when tikhub profile response has no userInfo", async () => {
    const app = createTestApp();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ data: {} }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const response = await app.request(
      "/api/tiktok/profile?username=tiktok",
      undefined,
      mockEnv,
      mockExecutionCtx,
    );

    expect(response.status).toBe(502);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.code).toBe("UpstreamResponseError");
  });
});
