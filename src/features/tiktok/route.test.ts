import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { tiktokDownloadRoutes } from "./route";

const createTestApp = () => {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/api/tiktok", tiktokDownloadRoutes);
  return app;
};

describe("tiktok routes", () => {
  it("returns starter download payload", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/tiktok/download?share_url=https://www.tiktok.com/@travelwithjustjess/video/7551026080430181662",
    );
    const body = (await response.json()) as {
      data: {
        provider: string;
        shareUrl: string;
        videoId: string | null;
        downloadUrl: null;
        status: string;
      };
      error: null;
    };

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data.provider).toBe("tiktok");
    expect(body.data.downloadUrl).toBeNull();
    expect(body.data.status).toBe("starter");
    expect(body.data.videoId).toBe("7551026080430181662");
  });

  it("returns 400 for non-tiktok share url", async () => {
    const app = createTestApp();
    const response = await app.request(
      "/api/tiktok/download?share_url=https://example.com/video/123",
    );

    expect(response.status).toBe(400);
  });
});
