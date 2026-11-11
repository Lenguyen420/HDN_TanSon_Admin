import { memberApi, registrationApi } from "@/api";
import {
  contentApis,
  contentCollections,
  type ContentCollection,
} from "../api/contentApi";
import {
  readAssociationData,
  saveAssociationRecord,
  removeAssociationRecord,
  type AssociationRecord,
  type AssociationData,
  type Collection,
} from "./association-store";
const CHANGED = "association-members-change";
const memberKeys = [
  "id",
  "name",
  "company",
  "jobTitle",
  "phone",
  "email",
  "birthDate",
  "joinedAt",
  "companyAddress",
  "status",
  "isBoard",
  "position",
];
function payload(record: AssociationRecord, keys = memberKeys) {
  return Object.fromEntries(
    keys
      .filter((key) => record[key] !== undefined && record[key] !== null)
      .map((key) => [key, record[key]]),
  );
}
function changed() {
  window.dispatchEvent(new Event(CHANGED));
}
export function subscribeMembers(callback: () => void) {
  window.addEventListener(CHANGED, callback);
  return () => window.removeEventListener(CHANGED, callback);
}
export function listMembers() {
  return listCollection("members");
}
export function listRegistrations() {
  return listCollection("registrations");
}
export function isBackendCollection(collection: Collection) {
  return (
    collection === "members" ||
    collection === "registrations" ||
    contentCollections.includes(collection as ContentCollection)
  );
}
const registrationKeys = [
  "id",
  "fullName",
  "company",
  "phone",
  "email",
  "birthDate",
  "jobTitle",
  "companyAddress",
  "taxCode",
  "date",
  "note",
];
const articleKeys = [
  "id",
  "title",
  "topic",
  "publishedAt",
  "status",
  "image",
  "author",
  "summary",
  "paragraphs",
];
const contentKeys: Record<ContentCollection, string[]> = {
  news: articleKeys,
  events: [...articleKeys, "event"],
  "member-visits": [...articleKeys, "visit"],
  notifications: [
    "id",
    "title",
    "category",
    "date",
    "time",
    "status",
    "description",
    "paragraphs",
  ],
  banners: ["id", "image", "alt", "order", "status"],
};
function collectionApi(collection: Collection) {
  if (collection === "members") return memberApi;
  if (collection === "registrations") return registrationApi;
  return contentApis[collection as ContentCollection];
}
export async function listContent() {
  const entries = await Promise.all(
    contentCollections.map(
      async (key) => [key, await listCollection(key)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<
    ContentCollection,
    AssociationRecord[]
  >;
}
async function listCollection(
  collection: "members" | "registrations" | ContentCollection,
) {
  const all: AssociationRecord[] = [];
  let page = 1;
  let total = 0;
  do {
    const api = collectionApi(collection);
    const body = await api.getAll({ limit: 100, page });
    all.push(...body.data);
    total = body.pagination.total;
    if (!body.data.length) break;
    page++;
  } while (all.length < total);
  return all;
}
export async function saveRecord(
  collection: Collection,
  record: AssociationRecord,
  isExisting = true,
  context?: AssociationData,
) {
  if (!isBackendCollection(collection)) {
    saveAssociationRecord(collection, record, context);
    return;
  }
  const api = collectionApi(collection);
  const data = payload(
    record,
    collection === "members"
      ? memberKeys
      : collection === "registrations"
        ? registrationKeys
        : contentKeys[collection as ContentCollection],
  );
  if (isExisting) await api.update(record.id, data);
  else await api.create(data);
  changed();
}
export async function removeRecord(collection: Collection, id: string) {
  if (!isBackendCollection(collection)) {
    removeAssociationRecord(collection, id);
    return;
  }
  const data = readAssociationData();
  if (
    collection === "members" &&
    ["fees", "activities", "sponsorships"].some((key) =>
      data.collections[key as Collection].some((item) => item.memberId === id),
    )
  )
    throw new Error(
      "Hội viên có hội phí, lịch sử tham gia hoặc tài trợ. Hãy chuyển sang ngừng hoạt động để giữ lịch sử.",
    );
  if (
    collection === "events" &&
    data.collections.activities.some((item) => item.eventId === id)
  )
    throw new Error(
      "Sự kiện đã có lịch sử tham gia. Hãy chuyển về bản nháp để giữ lịch sử.",
    );
  const api = collectionApi(collection);
  await api.delete(id);
  changed();
}
export async function approveRegistrationOnBackend(id: string) {
  await registrationApi.approve(id);
  changed();
}
export async function rejectRegistrationOnBackend(id: string, reason: string) {
  await registrationApi.reject(id, reason);
  changed();
}
