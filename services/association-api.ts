import { registrationApi, settingsApi } from "./api/index.ts";
import { settingsFields, type SettingsPayload } from "./api/settingsApi.ts";
import {
  contentCollections,
  type ContentCollection,
} from "./api/contentApi.ts";
import {
  collectionApi,
  cacheSavedRecord,
  cacheDeletedRecord,
  cacheSavedSettings,
  invalidateRemoteData,
  type RemoteCollection,
} from "./association-data.ts";
import {
  readAssociationData,
  saveAssociationRecord,
  removeAssociationRecord,
  type AssociationRecord,
  type AssociationData,
  type Collection,
} from "./association-store.ts";
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
export async function saveAssociationSettings(record: AssociationRecord) {
  const values = Object.fromEntries(
    settingsFields.map((key) => [key, String(record[key] ?? "")]),
  ) as SettingsPayload;
  const settings = await settingsApi.update(values);
  cacheSavedSettings(settings);
  return settings;
}
export function isBackendCollection(
  collection: Collection,
): collection is RemoteCollection {
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
  const saved = isExisting
    ? await api.update(record.id, data)
    : await api.create(data);
  cacheSavedRecord(collection, saved);
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
  cacheDeletedRecord(collection, id);
}
export async function approveRegistrationOnBackend(id: string) {
  const result = await registrationApi.approve(id);
  invalidateRemoteData("members");
  cacheSavedRecord("registrations", result.registration);
}
export async function rejectRegistrationOnBackend(id: string, reason: string) {
  const saved = await registrationApi.reject(id, reason);
  cacheSavedRecord("registrations", saved);
}
