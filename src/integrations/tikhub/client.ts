import {
  UpstreamRequestError,
  UpstreamResponseError,
} from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import {
  extractTikHubProfileInfo,
  extractTikHubVideoInfo,
} from "./schema";
import type {
  TikHubProfileInfo,
  TikHubVideoInfo,
} from "./schema";

const TIKHUB_VIDEO_INFO_ENDPOINT =
  "https://api.tikhub.io/api/v1/tiktok/app/v3/fetch_one_video_by_share_url";
const TIKHUB_PROFILE_ENDPOINT =
  "https://api.tikhub.io/api/v1/tiktok/web/fetch_user_profile";

export type TikHubClientError = UpstreamRequestError | UpstreamResponseError;

const tryTikHubRequest = <T>(
  request: () => Promise<T>,
): Promise<Result<T, UpstreamRequestError>> =>
  Result.tryPromise({
    try: request,
    catch: (cause) =>
      new UpstreamRequestError({
        service: "TikHub",
        cause,
      }),
  });

const fetchTikHubJson = async (params: {
  endpoint: string;
  query: Record<string, string>;
  token: string;
}): Promise<Result<unknown, TikHubClientError>> =>
  Result.gen(async function* () {
    const endpoint = new URL(params.endpoint);
    for (const [key, value] of Object.entries(params.query)) {
      endpoint.searchParams.set(key, value);
    }

    const response = yield* Result.await(
      tryTikHubRequest(() =>
        fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${params.token}`,
          },
        }),
      ),
    );

    if (!response.ok) {
      const responseText = yield* Result.await(
        tryTikHubRequest(() => response.text()),
      );

      return Result.err(
        new UpstreamResponseError({
          service: "TikHub",
          message: `TikHub returned ${response.status}: ${responseText.slice(0, 300)}`,
        }),
      );
    }

    const payload = yield* Result.await(
      tryTikHubRequest(() => response.json()),
    );

    return Result.ok(payload);
  });

export const fetchTikHubVideoInfo = (
  shareUrl: string,
  token: string,
): Promise<Result<TikHubVideoInfo, TikHubClientError>> =>
  fetchTikHubJson({
    endpoint: TIKHUB_VIDEO_INFO_ENDPOINT,
    query: { share_url: shareUrl },
    token,
  }).then((result) => result.andThen(extractTikHubVideoInfo));

export const fetchTikHubProfileInfo = (
  username: string,
  token: string,
): Promise<Result<TikHubProfileInfo, TikHubClientError>> =>
  fetchTikHubJson({
    endpoint: TIKHUB_PROFILE_ENDPOINT,
    query: { uniqueId: username },
    token,
  }).then((result) => result.andThen(extractTikHubProfileInfo));
