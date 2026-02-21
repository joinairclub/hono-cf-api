import { fetchTikHubProfileInfo } from "../../../integrations/tikhub/client";
import type { TikHubClientError } from "../../../integrations/tikhub/client";
import { getRequiredBindingString } from "../../../shared/env";
import type { ConfigurationError } from "../../../shared/errors/app-error";
import type { Result } from "../../../shared/result";
import type { TikTokProfileResult } from "./schema";

export type TikTokProfileServiceError = ConfigurationError | TikHubClientError;

export const resolveTikTokProfile = (params: {
  env: Env;
  username: string;
}): Promise<Result<TikTokProfileResult, TikTokProfileServiceError>> =>
  getRequiredBindingString(params.env, "TIKHUB_API_TOKEN")
    .andThenAsync((token) => fetchTikHubProfileInfo(params.username, token))
    .then((result) =>
      result.map((profileInfo) => ({
        username: params.username,
        profile: {
          userId: profileInfo.userId,
          username: profileInfo.username,
          secUserId: profileInfo.secUserId,
          nickname: profileInfo.nickname,
          verified: profileInfo.verified,
          avatarThumbUrl: profileInfo.avatarThumbUrl,
          avatarMediumUrl: profileInfo.avatarMediumUrl,
          avatarLargeUrl: profileInfo.avatarLargeUrl,
          bio: profileInfo.bio,
          bioLink: profileInfo.bioLink,
          category: profileInfo.category,
          createdTime: profileInfo.createdTime,
          createdAt: profileInfo.createdAt,
          stats: profileInfo.stats,
        },
      } satisfies TikTokProfileResult)),
    );
