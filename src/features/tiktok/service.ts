import { Result } from "../../shared/result";

export type TikTokDownloadPreview = {
  provider: "tiktok";
  shareUrl: string;
  videoId: string | null;
  downloadUrl: null;
  status: "starter";
};

const extractVideoId = (shareUrl: string): string | null => {
  try {
    const match = new URL(shareUrl).pathname.match(/\/video\/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
};

export const previewTikTokDownload = (shareUrl: string) =>
  Result.ok({
    provider: "tiktok" as const,
    shareUrl,
    videoId: extractVideoId(shareUrl),
    downloadUrl: null,
    status: "starter" as const,
  } satisfies TikTokDownloadPreview);
