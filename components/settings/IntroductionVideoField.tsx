"use client";
import { useEffect, useRef, useState } from "react";
import IntroductionVideoPreview from "./IntroductionVideoPreview";
import { validateIntroductionVideo } from "@/services/api/introductionVideoApi";
export default function IntroductionVideoField({
  value,
  disabled,
  progress,
}: {
  value: string;
  disabled: boolean;
  progress: string;
}) {
  const [localUrl, setLocalUrl] = useState(""),
    [fileName, setFileName] = useState(""),
    [removed, setRemoved] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    },
    [localUrl],
  );
  const current = removed ? "" : value;
  return (
    <div className="form-field full-width">
      <span>Video giới thiệu</span>
      <input type="hidden" name="introductionVideoMode" value="file" />
      <input
        type="hidden"
        name="introductionVideoUrl"
        value={localUrl ? "" : current}
      />
      <input
        ref={input}
        aria-label="Chọn video giới thiệu từ máy tính"
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
              file.name + " (" + (file.size / 1024 / 1024).toFixed(1) + " MiB)",
            );
          } catch (cause) {
            event.currentTarget.value = "";
            setError(
              cause instanceof Error ? cause.message : "Video không hợp lệ.",
            );
          }
        }}
      />
      <small>
        Chọn video MP4 hoặc WebM từ máy tính, tối đa 100 MiB. Video được tải lên
        khi bấm Lưu thông tin Hội.
      </small>
      {fileName && <small>{fileName}</small>}
      {error && <small role="alert">{error}</small>}
      {progress && <small role="status">{progress}</small>}
      <IntroductionVideoPreview
        url={localUrl || current}
        local={Boolean(localUrl)}
      />
      <button
        type="button"
        className="button button-secondary"
        disabled={disabled}
        onClick={() => {
          setRemoved(true);
          setLocalUrl("");
          setFileName("");
          setError("");
          if (input.current) input.current.value = "";
        }}
      >
        Xóa video
      </button>
    </div>
  );
}
