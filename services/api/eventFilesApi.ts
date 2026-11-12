import axios from "./axiosConfig.ts";
import { readEventFiles } from "../event-form.ts";

export const MAX_EVENT_FILE_SIZE = 4 * 1024 * 1024;
export const EVENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp";
export function validateEventFile(file: File) {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  if (!EVENT_FILE_ACCEPT.split(",").includes(extension))
    throw new Error(
      "Vui lòng chọn PDF, Word, Excel, PowerPoint hoặc ảnh JPG/PNG/WebP.",
    );
  if (!file.size || file.size > MAX_EVENT_FILE_SIZE)
    throw new Error("Mỗi file cần có nội dung và không vượt quá 4 MB.");
}
const pendingUploads = new WeakMap<File, Promise<string>>();
function upload(file: File) {
  if (!pendingUploads.has(file)) {
    const request = axios
      .post<{ data: { url: string } }>("/association/event-files", file, {
        timeout: 60_000,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
      })
      .then((response) => response.data.data.url)
      .catch((error) => {
        pendingUploads.delete(file);
        throw error;
      });
    pendingUploads.set(file, request);
  }
  return pendingUploads.get(file)!;
}

export async function readSelectedEventFiles(form: FormData, name: string) {
  const prepared = new FormData();
  for (const key of ["id", "title", "url", "date"])
    for (const value of form.getAll(`${name}:${key}`))
      prepared.append(`${name}:${key}`, value);
  const urls = prepared.getAll(`${name}:url`).map(String);
  const files = form.getAll(`${name}:file`);
  const selected: { file: File; index: number }[] = [];
  files.forEach((file, index) => {
    if (!(file instanceof File) || !file.size) return;
    validateEventFile(file);
    selected.push({ file, index });
    urls[index] =
      "/api/v1/public/event-files/00000000-0000-4000-8000-000000000000";
  });
  const replaceUrls = () => {
    prepared.delete(`${name}:url`);
    for (const url of urls) prepared.append(`${name}:url`, url);
  };
  replaceUrls();
  readEventFiles(prepared, name);
  // Limit simultaneous uploads while keeping each request within Vercel's body limit.
  for (let start = 0; start < selected.length; start += 3)
    await Promise.all(
      selected.slice(start, start + 3).map(async ({ file, index }) => {
        urls[index] = await upload(file);
      }),
    );
  replaceUrls();
  return readEventFiles(prepared, name);
}
