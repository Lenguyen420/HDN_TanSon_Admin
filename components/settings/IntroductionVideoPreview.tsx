"use client";
import {
  managedVideoPattern,
  localVideoPattern,
  videoPreviewUrl,
  youtubeVideoUrl,
} from "@/services/api/introductionVideoApi";
export default function IntroductionVideoPreview({
  url,
  local = false,
}: {
  url: string;
  local?: boolean;
}) {
  const value = url.trim();
  if (!value) return null;
  const youtube = youtubeVideoUrl(value);
  if (
    !youtube &&
    !managedVideoPattern.test(value) &&
    !localVideoPattern.test(value) &&
    !(local && value.startsWith("blob:"))
  ) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password)
        return null;
    } catch {
      return null;
    }
  }
  return (
    <span
      style={{
        display: "block",
        width: "100%",
        maxWidth: 560,
        aspectRatio: "16 / 9",
        overflow: "hidden",
        borderRadius: 12,
        background: "#102337",
        marginTop: 12,
      }}
    >
      {youtube ? (
        <iframe
          src={youtube}
          title="Xem trước video giới thiệu Hội"
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          style={{ width: "100%", height: "100%", border: 0 }}
        />
      ) : (
        <video
          key={value}
          src={videoPreviewUrl(value)}
          controls
          playsInline
          preload="metadata"
          style={{ display: "block", width: "100%", height: "100%" }}
        />
      )}
    </span>
  );
}
