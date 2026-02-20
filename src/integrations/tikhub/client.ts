import {
  UpstreamRequestError,
  UpstreamResponseError,
} from "../../shared/errors/app-error";
import { Result } from "../../shared/result";
import {
  extractTikHubDownloadInfo,
  extractTikHubVideoInfo,
  type TikHubDownloadInfo,
  type TikHubVideoInfo,
} from "./schema";

const TIKHUB_DOWNLOAD_ENDPOINT =
  "https://api.tikhub.io/api/v1/tiktok/app/v3/fetch_one_video_by_share_url";

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

const fetchTikHubPayload = async (
  shareUrl: string,
  token: string,
): Promise<Result<unknown, TikHubClientError>> =>
  Result.gen(async function* () {
    const endpoint = new URL(TIKHUB_DOWNLOAD_ENDPOINT);
    endpoint.searchParams.set("share_url", shareUrl);

    const response = yield* Result.await(
      tryTikHubRequest(() =>
        fetch(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ),
    );

    if (!response.ok) {
      const responseText = yield* Result.await(tryTikHubRequest(() => response.text()));

      return Result.err(
        new UpstreamResponseError({
          service: "TikHub",
          message: `TikHub returned ${response.status}: ${responseText.slice(0, 300)}`,
        }),
      );
    }

    const payload = yield* Result.await(
      tryTikHubRequest(() => response.json() as Promise<unknown>),
    );

    return Result.ok(payload);
  });

export const fetchTikHubDownloadInfo = (
  shareUrl: string,
  token: string,
): Promise<Result<TikHubDownloadInfo, TikHubClientError>> =>
  fetchTikHubPayload(shareUrl, token).then((result) =>
    result.andThen(extractTikHubDownloadInfo),
  );

export const fetchTikHubVideoInfo = (
  shareUrl: string,
  token: string,
): Promise<Result<TikHubVideoInfo, TikHubClientError>> =>
  fetchTikHubPayload(shareUrl, token).then((result) =>
    result.andThen(extractTikHubVideoInfo),
  );
