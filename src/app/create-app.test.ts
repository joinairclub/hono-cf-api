import { describe, expect, it } from "vitest";
import { createApp } from "@/app/create-app";
import { apiErrorResponseSchema } from "@/shared/schemas/api-response";

describe("create app routes", () => {
  it("returns ping", async () => {
    const app = createApp();
    const response = await app.request("/ping");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ pong: true });
  });

  it("returns health", async () => {
    const app = createApp();
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("returns not found envelope", async () => {
    const app = createApp();
    const response = await app.request("/does-not-exist");

    expect(response.status).toBe(404);
    const body = apiErrorResponseSchema.parse(await response.json());
    expect(body.error.message).toBe("Not Found");
    expect(body.error.code).toBe("NotFoundError");
  });
});
