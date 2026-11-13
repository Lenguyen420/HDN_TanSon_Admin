"use client";
import { useEffect, useState } from "react";
import IntroductionVideoPreview from "./IntroductionVideoPreview";
import {
  validateIntroductionVideo,
  youtubeVideoUrl,
} from "@/services/api/introductionVideoApi";

export default function IntroductionVideoField({
  value,
  disabled,
  progress,
}: {
  value: string;
  disabled: boolean;
  progress: string;
}) {
  const [mode, setMode] = useState(youtubeVideoUrl(value) ? "youtube" : "file");
  const [link, setLink] = useState(youtubeVideoUrl(value) ? value : "");
  const [localUrl, setLocalUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [removed, setRemoved] = useState(false);
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );
  const current = removed ? "" : value;
  function switchMode(next: string) {
    setMode(next);
    setLocalUrl("");
    setFileName("");
    setError("");
  }
  return (
    <div className="form-field full-width">
      <span>Video giới thiệu</span>
      <div className="video-source-options" role="group" aria-label="Nguồn video giới thiệu">
        <label>
          <input
            type="radio"
            name="introductionVideoSource"
            checked={mode === "file"}
            disabled={disabled}
            onChange={() => switchMode("file")}
          />{" "}
          Chọn từ máy tính
        </label>
        <label>
          <input
            type="radio"
            name="introductionVideoSource"
            checked={mode === "youtube"}
            disabled={disabled}
            onChange={() => switchMode("youtube")}
          />{" "}
          Link YouTube
        </label>
      </div>
      <input type="hidden" name="introductionVideoMode" value={mode} />
      <input
        type="hidden"
        name="introductionVideoUrl"
        value={mode === "youtube" ? link : localUrl ? "" : current}
      />
      {mode === "file" ? (
        <>
          <input
            aria-label="Chọn video giới thiệu"
            name="introductionVideoFile"
            type="file"
            accept="video/mp4,video/webm,.mp4,.webm"
            disabled={disabled}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setLocalUrl("");
              setFileName("");
              setError("");
              if (!file) return;
              try {
                validateIntroductionVideo(file);
                setLocalUrl(URL.createObjectURL(file));
                setFileName(
                  `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
                );
              } catch (cause) {
                event.currentTarget.value = "";
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Video không hợp lệ.",
                );
              }
            }}
          />
          <small>
            MP4 hoặc WebM, tối đa 100 MiB. Video được tải lên khi bấm Lưu thông
            tin Hội.
          </small>
          {fileName && <small>{fileName}</small>}
        </>
      ) : (
        <input
          aria-label="Link YouTube giới thiệu"
          type="url"
          value={link}
          maxLength={2048}
          placeholder="https://www.youtube.com/watch?v=..."
          disabled={disabled}
          onChange={(event) => setLink(event.currentTarget.value)}
        />
      )}
      {error && <small role="alert">{error}</small>}
      {progress && <small role="status">{progress}</small>}
      <IntroductionVideoPreview
        url={mode === "youtube" ? link : localUrl || current}
        local={Boolean(localUrl) && mode === "file"}
      />
      <button
        type="button"
        className="button button-secondary"
        disabled={disabled}
        onClick={(event) => {
          setRemoved(true);
          setLink("");
          setLocalUrl("");
          setFileName("");
          setError("");
          const input = event.currentTarget
            .closest(".form-field")
            ?.querySelector<HTMLInputElement>('input[type="file"]');
          if (input) input.value = "";
        }}
      >
        Xóa video
      </button>
      <small>
        Hiển thị dưới tên Hội tại trang Giới thiệu. Để trống để ẩn video.
      </small>
    </div>
  );
}
