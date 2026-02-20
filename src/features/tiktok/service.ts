import {
  fetchTikHubDownloadInfo,
  fetchTikHubVideoInfo,
} from "../../integrations/tikhub/client";
import type { TikHubClientError } from "../../integrations/tikhub/client";
import { getRequiredBindingString } from "../../shared/env";
import type { ConfigurationError } from "../../shared/errors/app-error";
import type { Result } from "../../shared/result";

export interface TikTokDownloadResult {
  provider: "tiktok";
  source: "tikhub";
  shareUrl: string;
  videoId: string;
  downloadUrl: string;
  status: "resolved";
}

export interface TikTokInfoResult {
  provider: "tiktok";
  source: "tikhub";
  shareUrl: string;
  status: "resolved";
  video: {
    id: string;
    description: string | null;
    durationMs: number | null;
    createdAt: string | null;
    hashtags: string[];
    author: {
      userId: string | null;
      username: string | null;
      nickname: string | null;
    };
    stats: {
      playCount: number | null;
      likeCount: number | null;
      commentCount: number | null;
      shareCount: number | null;
    };
    thumbnailUrl: string | null;
    downloadUrl: string;
  };
}

export type TikTokServiceError = ConfigurationError | TikHubClientError;

export const resolveTikTokDownload = (params: {
  env: Env;
  shareUrl: string;
}): Promise<Result<TikTokDownloadResult, TikTokServiceError>> =>
  getRequiredBindingString(params.env, "TIKHUB_API_TOKEN")
    .andThenAsync((token) => fetchTikHubDownloadInfo(params.shareUrl, token))
    .then((result) =>
      result.map((downloadInfo) => ({
        provider: "tiktok" as const,
        source: "tikhub" as const,
        shareUrl: params.shareUrl,
        videoId: downloadInfo.awemeId,
        downloadUrl: downloadInfo.downloadUrl,
        status: "resolved" as const,
      } satisfies TikTokDownloadResult)),
    );

export const resolveTikTokInfo = (params: {
  env: Env;
  shareUrl: string;
}): Promise<Result<TikTokInfoResult, TikTokServiceError>> =>
  getRequiredBindingString(params.env, "TIKHUB_API_TOKEN")
    .andThenAsync((token) => fetchTikHubVideoInfo(params.shareUrl, token))
    .then((result) =>
      result.map((videoInfo) => ({
        provider: "tiktok" as const,
        source: "tikhub" as const,
        shareUrl: params.shareUrl,
        status: "resolved" as const,
        video: {
          id: videoInfo.awemeId,
          description: videoInfo.description,
          durationMs: videoInfo.durationMs,
          createdAt: videoInfo.createdAt,
          hashtags: videoInfo.hashtags,
          author: videoInfo.author,
          stats: videoInfo.stats,
          thumbnailUrl: videoInfo.thumbnailUrl,
          downloadUrl: videoInfo.downloadUrl,
        },
      } satisfies TikTokInfoResult)),
    );
