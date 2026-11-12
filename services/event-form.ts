export type AgendaItem = { time: string; title: string };
export type EventFile = {
  id: string;
  title: string;
  url: string;
  publishedAt?: string;
};
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseTimeRange(value: string) {
  const parts = value
    .trim()
    .match(/^(\d{1,2})[:h](\d{2})\s*[-–—]\s*(\d{1,2})[:h](\d{2})$/);
  if (!parts) return { start: "", end: "" };
  const start = `${parts[1].padStart(2, "0")}:${parts[2]}`;
  const end = `${parts[3].padStart(2, "0")}:${parts[4]}`;
  return clock.test(start) && clock.test(end)
    ? { start, end }
    : { start: "", end: "" };
}

export function readTimeRange(form: FormData, name: string) {
  const start = String(form.get(`${name}:start`) ?? "");
  const end = String(form.get(`${name}:end`) ?? "");
  if (!clock.test(start) || !clock.test(end))
    throw new Error("Vui lòng chọn đầy đủ giờ bắt đầu và giờ kết thúc.");
  if (end <= start)
    throw new Error("Giờ kết thúc phải sau giờ bắt đầu trong ngày tổ chức.");
  return `${start} - ${end}`;
}

export function readAgenda(form: FormData, name: string): AgendaItem[] {
  const times = form.getAll(`${name}:time`);
  const titles = form.getAll(`${name}:title`);
  if (times.length > 100 || times.length !== titles.length)
    throw new Error("Lịch trình không hợp lệ hoặc vượt quá 100 mục.");
  return times
    .map((time, index) => {
      const title = String(titles[index]).trim();
      if (!clock.test(String(time)) || !title || title.length > 500)
        throw new Error(
          `Vui lòng chọn giờ và nhập nội dung hợp lệ cho mục lịch trình ${index + 1}.`,
        );
      return { time: String(time), title };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function isEventFileUrl(value: string) {
  return (
    /^\/api\/v1\/public\/event-files\/[a-f0-9-]{36}$/.test(value) ||
    isHttpsUrl(value)
  );
}
export function eventFileHref(value: string) {
  return value.startsWith("/api/v1/public/event-files/")
    ? value.replace("/api/v1/public/event-files/", "/uploads/event-files/")
    : value;
}

export function readEventFiles(form: FormData, name: string): EventFile[] {
  const ids = form.getAll(`${name}:id`);
  const titles = form.getAll(`${name}:title`);
  const urls = form.getAll(`${name}:url`);
  const dates = form.getAll(`${name}:date`);
  if (
    ids.length > 100 ||
    [titles, urls, dates].some((items) => items.length !== ids.length)
  )
    throw new Error("Danh sách tài liệu không hợp lệ hoặc vượt quá 100 mục.");
  const files = ids.flatMap((id, index) => {
    const title = String(titles[index]).trim();
    const url = String(urls[index]).trim();
    const date = String(dates[index]);
    if (!title && !url && !date) return [];
    if (
      !/^[a-zA-Z0-9_-]{1,100}$/.test(String(id)) ||
      !title ||
      title.length > 300 ||
      url.length > 2048 ||
      !isEventFileUrl(url)
    )
      throw new Error(
        `Tài liệu ${index + 1} cần tên và file đã tải lên hoặc liên kết HTTPS hợp lệ.`,
      );
    if (
      date &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date)
    )
      throw new Error(`Ngày công bố tài liệu ${index + 1} không hợp lệ.`);
    return [
      {
        id: String(id),
        title,
        url,
        ...(date ? { publishedAt: date } : {}),
      },
    ];
  });
  if (new Set(files.map((file) => file.id)).size !== files.length)
    throw new Error("Mã tài liệu không được trùng.");
  return files;
}
