"use client";

import Image from "next/image";
import { notify } from "@/lib/notify";
import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function validateImage(file: File) {
  if (!ACCEPTED_TYPES.includes(file.type))
    throw new Error("Vui lòng chọn ảnh JPG, PNG hoặc WebP.");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Ảnh quá lớn. Vui lòng chọn ảnh không quá 10 MB.");
}

export async function readSelectedImage(form: FormData, name: string) {
  const file = form.get(`${name}:file`);
  if (!(file instanceof File) || !file.size)
    return String(form.get(name) ?? "").trim();
  validateImage(file);
  const url = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể xử lý ảnh trên trình duyệt này.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/webp", 0.82);
    if (result.length > 1_400_000)
      throw new Error("Ảnh có quá nhiều chi tiết. Vui lòng chọn ảnh nhỏ hơn.");
    return result;
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message.startsWith("Ảnh có")
        ? error.message
        : "Không đọc được ảnh. Vui lòng chọn một ảnh khác.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ImagePicker({
  name,
  value,
  required = false,
}: {
  name: string;
  value: string;
  required?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const source = file ? preview : removed ? "" : value;
  return (
    <div className="image-picker">
      <input type="hidden" name={name} value={removed ? "" : value} />
      {source && (
        <Image
          src={source}
          alt="Ảnh đã chọn"
          width={400}
          height={220}
          unoptimized
          className="image-picker-preview"
        />
      )}
      <div className="image-picker-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={19} />{" "}
          {source ? "Chọn ảnh khác" : "Chọn ảnh từ máy tính"}
        </button>
        {source && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => {
              setFile(null);
              setPreview("");
              setRemoved(true);
              setError("");
              if (input.current) {
                input.current.value = "";
                input.current.setCustomValidity("");
              }
            }}
          >
            Bỏ ảnh
          </button>
        )}
      </div>
      <input
        ref={input}
        className="image-picker-input"
        type="file"
        name={`${name}:file`}
        accept="image/jpeg,image/png,image/webp"
        required={required && !source}
        aria-label="Chọn ảnh từ máy tính"
        aria-describedby={id}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (!selected) return;
          try {
            validateImage(selected);
            event.target.setCustomValidity("");
            setError("");
            setPreview(URL.createObjectURL(selected));
            setFile(selected);
          } catch (cause) {
            const message =
              cause instanceof Error ? cause.message : "Ảnh không hợp lệ.";
            event.target.setCustomValidity(message);
            setError(message);
            notify.error(message);
          }
        }}
      />
      <p id={id} className="image-picker-hint">
        JPG, PNG hoặc WebP · Tối đa 10 MB · Ảnh được thu nhỏ khi lưu.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
