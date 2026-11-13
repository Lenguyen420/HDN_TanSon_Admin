"use client";
import Image from "next/image";
import { useState } from "react";
export default function BusinessLicensePreview({
  id,
  available,
}: {
  id: string;
  available: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!available)
    return (
      <section>
        <h3>Giấy phép kinh doanh</h3>
        <p>Hồ sơ này chưa có ảnh giấy phép kinh doanh.</p>
      </section>
    );
  const url =
    "/api/association/registrations/" +
    encodeURIComponent(id) +
    "/business-license";
  return (
    <section>
      <h3>Giấy phép kinh doanh</h3>
      {failed ? (
        <p role="alert">
          Chưa tải được ảnh giấy phép. Vui lòng mở lại hồ sơ để thử lại.
        </p>
      ) : (
        <Image
          src={url}
          alt="Ảnh giấy phép kinh doanh đính kèm hồ sơ"
          width={900}
          height={1200}
          unoptimized
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            maxHeight: 560,
            objectFit: "contain",
            height: "auto",
          }}
        />
      )}
      <a href={url} target="_blank" rel="noopener noreferrer">
        Mở ảnh giấy phép kinh doanh
      </a>
    </section>
  );
}
