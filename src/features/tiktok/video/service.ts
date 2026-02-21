import {
  fetchTikHubVideoInfo,
} from "../../../integrations/tikhub/client";
import type { TikHubClientError } from "../../../integrations/tikhub/client";
import { getRequiredBindingString } from "../../../shared/env";
import type { ConfigurationError } from "../../../shared/errors/app-error";
import type { Result } from "../../../shared/result";
import type { TikTokInfoResult } from "./schema";

export type TikTokVideoServiceError = ConfigurationError | TikHubClientError;

export const resolveTikTokInfo = (params: {
  env: Env;
  shareUrl: string;
}): Promise<Result<TikTokInfoResult, TikTokVideoServiceError>> =>
  getRequiredBindingString(params.env, "TIKHUB_API_TOKEN")
    .andThenAsync((token) => fetchTikHubVideoInfo(params.shareUrl, token))
    .then((result) =>
      result.map((videoInfo) => ({
        shareUrl: params.shareUrl,
        video: {
          id: videoInfo.awemeId,
          description: videoInfo.description,
          durationMs: videoInfo.durationMs,
          createdAt: videoInfo.createdAt,
          hashtags: videoInfo.hashtags,
          author: videoInfo.author,
          stats: videoInfo.stats,
          thumbnailUrl: videoInfo.thumbnailUrl,
          audioUrl: videoInfo.audioUrl,
          downloadUrl: videoInfo.downloadUrl,
        },
      } satisfies TikTokInfoResult)),
    );
