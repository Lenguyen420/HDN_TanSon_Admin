"use client";
import Image from "next/image";
import { useState } from "react";
export default function FeeProofPreview({
  payment,
}: {
  payment: { id: string; proofUrl: string };
}) {
  const [open, setOpen] = useState(false),
    [error, setError] = useState(false);
  if (!payment.proofUrl) return null;
  const managed = payment.proofUrl.startsWith("/api/v1/membership-fees/");
  const url = managed
    ? "/api/association/membership-fee-payments/" +
      encodeURIComponent(payment.id) +
      "/proof"
    : payment.proofUrl;
  if (!managed)
    return (
      <a href={url} target="_blank" rel="noreferrer">
        Mở minh chứng
      </a>
    );
  return (
    <section>
      <button
        type="button"
        className="button button-secondary"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Ẩn ảnh minh chứng" : "Xem ảnh minh chứng"}
      </button>
      {open &&
        (error ? (
          <p role="alert">Chưa tải được ảnh minh chứng.</p>
        ) : (
          <Image
            src={url}
            alt="Ảnh minh chứng thanh toán"
            width={900}
            height={1200}
            unoptimized
            onError={() => setError(true)}
            style={{
              width: "100%",
              height: "auto",
              maxHeight: 560,
              objectFit: "contain",
            }}
          />
        ))}{" "}
      {open && (
        <a href={url} target="_blank" rel="noreferrer">
          Mở ảnh đầy đủ
        </a>
      )}
    </section>
  );
}
