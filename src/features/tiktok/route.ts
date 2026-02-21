import { Hono } from "hono";
import { tiktokProfileRoutes } from "./profile/route";
import { tiktokVideoRoutes } from "./video/route";

export const tiktokRoutes = new Hono<{ Bindings: Env }>();

tiktokRoutes.route("/", tiktokVideoRoutes);
tiktokRoutes.route("/", tiktokProfileRoutes);
