import { FileText, ImageIcon } from "lucide-react";

import type { TaskAttachment } from "@/services/kpi-report";

import { formatFileSize } from "./format";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;

function isImage(attachment: TaskAttachment): boolean {
  if (attachment.mimeType?.startsWith("image/")) {
    return true;
  }

  return IMAGE_EXTENSIONS.test(attachment.fileName ?? attachment.url);
}

function getName(attachment: TaskAttachment, index: number): string {
  if (attachment.fileName) {
    return attachment.fileName;
  }

  const fromUrl = attachment.url.split("?")[0].split("/").pop();

  return fromUrl || `Tệp ${index + 1}`;
}

export default function AttachmentList({
  attachments,
  emptyLabel = "Không có tệp đính kèm",
  title,
}: {
  attachments: TaskAttachment[];
  emptyLabel?: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
      {attachments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => {
            const name = getName(attachment, index);
            const size = formatFileSize(attachment.size);

            if (isImage(attachment)) {
              return (
                <li key={attachment.id}>
                  <a
                    className="group block w-28 overflow-hidden rounded-lg border border-slate-200 bg-white transition hover:border-blue-400"
                    download={name}
                    href={attachment.url}
                    rel="noreferrer"
                    target="_blank"
                    title={`${name}${size ? ` · ${size}` : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={name}
                      className="h-20 w-full bg-slate-100 object-cover"
                      loading="lazy"
                      src={attachment.url}
                    />
                    <span className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-slate-600">
                      <ImageIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
                      <span className="truncate">{name}</span>
                    </span>
                  </a>
                </li>
              );
            }

            return (
              <li key={attachment.id}>
                <a
                  className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
                  download={name}
                  href={attachment.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="max-w-[220px] truncate">{name}</span>
                  {size ? <span className="shrink-0 text-slate-400">{size}</span> : null}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
