import { Download, X } from "lucide-react";
import { ensureStoredAdminToken } from "@/services/auth.service";
import formatValue from "./formatValue";
import { AdminRecord } from "@/services/feedback";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

function buildFileUrl(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "";
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `${API_BASE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDateValue(value: unknown): string {
  if (!value) {
    return "-";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return formatValue(value);
  }

  return date.toLocaleString("vi-VN");
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-1 border-b border-[#edf0f4] py-2 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-semibold text-[#526071]">{label}</dt>
      <dd className="break-words text-sm leading-6 text-[#182433]">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function DetailDateRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="grid gap-1 border-b border-[#edf0f4] py-2 last:border-0 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm font-semibold text-[#526071]">{label}</dt>
      <dd className="break-words text-sm leading-6 text-[#182433]">
        {formatDateValue(value)}
      </dd>
    </div>
  );
}

async function downloadAttachment(id: string, fileName: string) {
  const token = await ensureStoredAdminToken();
  const response = await fetch(`https://be.government.kidoedu.vn/attachments/${id}/download`, {
    method: "GET",
    headers: {
      Accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Không thể tải tệp đính kèm.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function RecordDetailModal({
  onClose,
  record,
}: {
  onClose: () => void;
  record: AdminRecord;
}) {
  const imageUrls = Array.isArray(record.imageUrls) ? record.imageUrls : [];

  const attachmentUrls = Array.isArray(record.attachmentUrls)
    ? record.attachmentUrls
    : [];

  const attachments = Array.isArray(record.attachments)
    ? record.attachments
    : [];

  const zone =
    typeof record.zone === "object" && record.zone !== null
      ? (record.zone as AdminRecord)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 sm:items-center">
      <section className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-md border border-[#dfe3e8] bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-[#dfe3e8] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#0d6efd]">
              Chi tiết phản ánh
            </p>
            <h2 className="mt-1 text-base font-semibold text-[#182433]">
              {formatValue(record.title)}
            </h2>
          </div>

          <button
            aria-label="Đóng"
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#667085] hover:bg-[#f1f5f9]"
            onClick={onClose}
            title="Đóng"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="max-h-[calc(92vh-78px)] overflow-y-auto p-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-md border border-[#dfe3e8] bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase text-[#0d6efd]">
                Nội dung phản ánh
              </h3>

              <dl>
                <DetailRow label="ID" value={record.id} />
                <DetailRow label="Tiêu đề" value={record.title} />
                <DetailRow label="Nội dung" value={record.content} />
                <DetailRow label="Loại phản ánh" value={record.type} />
                <DetailRow
                  label="Đơn vị tiếp nhận"
                  value={record.receivingUnitName}
                />
                <DetailRow
                  label="Trạng thái"
                  value={record.statusText ?? record.status}
                />
                <DetailRow label="Phản hồi" value={record.response} />
              </dl>
            </section>

            <section className="rounded-md border border-[#dfe3e8] bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase text-[#0d6efd]">
                Thông tin người gửi
              </h3>

              <dl>
                <DetailRow label="Ẩn danh" value={record.isAnonymous} />
                <DetailRow label="Họ tên" value={record.senderFullName} />
                <DetailRow label="Số điện thoại" value={record.senderPhone} />
                <DetailRow label="Email" value={record.senderEmail} />
                <DetailRow
                  label="Cung cấp địa chỉ"
                  value={record.provideSenderAddress}
                />
                <DetailRow
                  label="Địa chỉ người gửi"
                  value={record.senderAddress}
                />
              </dl>
            </section>

            <section className="rounded-md border border-[#dfe3e8] bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase text-[#0d6efd]">
                Địa điểm xảy ra
              </h3>

              <dl>
                <DetailRow label="Tỉnh/Thành" value={record.province} />
                <DetailRow label="Xã/Phường" value={record.ward} />
                <DetailRow
                  label="Địa chỉ chi tiết"
                  value={record.addressDetail}
                />
                <DetailRow label="Vĩ độ" value={record.latitude} />
                <DetailRow label="Kinh độ" value={record.longitude} />
                <DetailRow label="Khu vực" value={zone?.name} />
                <DetailRow label="Mô tả khu vực" value={zone?.description} />
              </dl>
            </section>

            <section className="rounded-md border border-[#dfe3e8] bg-white p-4">
              <h3 className="mb-2 text-sm font-bold uppercase text-[#0d6efd]">
                Thời gian và hiển thị
              </h3>

              <dl>
                <DetailDateRow
                  label="Thời điểm xảy ra"
                  value={record.occurredAt}
                />
                <DetailDateRow label="Ngày gửi" value={record.creationTime} />
                <DetailDateRow
                  label="Ngày phản hồi"
                  value={record.responseTime}
                />
                <DetailRow label="Công khai phản ánh" value={record.isPublic} />
                <DetailRow
                  label="Công khai kết quả"
                  value={record.isResultPublic}
                />
              </dl>
            </section>
          </div>

          <section className="mt-5 rounded-md border border-[#dfe3e8] bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase text-[#0d6efd]">
              Hình ảnh
            </h3>

            {imageUrls.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {imageUrls.map((url, index) => {
                  const fullUrl = buildFileUrl(url);

                  return (
                    <a
                      className="block overflow-hidden rounded-md border border-[#dfe3e8] bg-[#f8fafc]"
                      href={fullUrl}
                      key={`${String(url)}-${index}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <img
                        alt={`Ảnh phản ánh ${index + 1}`}
                        className="h-40 w-full object-cover"
                        src={fullUrl}
                      />
                    </a>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#667085]">Không có hình ảnh.</p>
            )}
          </section>

          <section className="mt-5 rounded-md border border-[#dfe3e8] bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase text-[#0d6efd]">
              Tệp đính kèm
            </h3>

            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((attachment, index) => {
                  const item =
                    typeof attachment === "object" && attachment !== null
                      ? (attachment as AdminRecord)
                      : {};

                  const id =
                    typeof item.id === "string" || typeof item.id === "number"
                      ? String(item.id)
                      : "";
                  const fileName = item.fileName ?? `Tệp đính kèm ${index + 1}`;

                  return (
                    <button
                      className="flex items-center justify-between gap-3 rounded-md border border-[#dfe3e8] bg-[#f8fafc] px-3 py-2 text-sm text-[#182433] hover:border-[#0d6efd] hover:bg-[#eef6ff]"
                      disabled={!id}
                      key={String(item.id ?? index)}
                      onClick={() => {
                        if (!id) {
                          return;
                        }

                        void downloadAttachment(id, formatValue(fileName)).catch(
                          (error) => {
                            alert(
                              error instanceof Error
                                ? error.message
                                : "Không thể tải tệp đính kèm.",
                            );
                          },
                        );
                      }}
                      type="button"
                    >
                      <span className="font-medium">
                        {formatValue(fileName)}
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs text-[#667085]">
                        <Download className="h-4 w-4" />
                        {id ? formatValue(item.mimeType) : "Thiếu mã tệp"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : attachmentUrls.length > 0 ? (
              <div className="space-y-2">
                {attachmentUrls.map((url, index) => {
                  return (
                    <div
                      className="rounded-md border border-[#dfe3e8] bg-[#f8fafc] px-3 py-2 text-sm text-[#667085]"
                      key={`${String(url)}-${index}`}
                    >
                      Tệp đính kèm {index + 1}: cần mã tệp để tải qua endpoint
                      bảo mật.
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#667085]">Không có tệp đính kèm.</p>
            )}
          </section>

          <section className="mt-5 rounded-md border border-[#dfe3e8] bg-white p-4">
            <h3 className="mb-3 text-sm font-bold uppercase text-[#0d6efd]">
              Dữ liệu JSON đầy đủ
            </h3>

            <pre className="max-h-[360px] overflow-auto rounded-md bg-[#0f172a] p-4 text-xs leading-6 text-white">
              {JSON.stringify(record, null, 2)}
            </pre>
          </section>
        </div>
      </section>
    </div>
  );
}
