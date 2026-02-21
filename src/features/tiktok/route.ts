import { Hono } from "hono";
import { tiktokProfileRoutes } from "@/features/tiktok/profile/route";
import { tiktokVideoRoutes } from "@/features/tiktok/video/route";

export const tiktokRoutes = new Hono<{ Bindings: Env }>();

tiktokRoutes.route("/", tiktokVideoRoutes);
tiktokRoutes.route("/", tiktokProfileRoutes);
