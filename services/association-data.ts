import { memberApi, registrationApi, settingsApi } from "./api/index.ts";
import {
  contentApis,
  contentCollections,
  type ContentCollection,
} from "./api/contentApi.ts";
import {
  readAssociationData,
  type AssociationData,
  type AssociationRecord,
  type Collection,
} from "./association-store.ts";
import { createQueryCache } from "./query-cache.ts";

export type RemoteCollection = "members" | "registrations" | ContentCollection;
export type DataKey = RemoteCollection | "settings";
const cache = createQueryCache<
  DataKey,
  AssociationRecord | AssociationRecord[]
>();
export const subscribeRemoteData = cache.subscribe;
export const invalidateRemoteData = cache.invalidate;
export const remoteCollections: readonly Collection[] = [
  "members",
  "registrations",
  ...contentCollections,
];

export function collectionApi(collection: RemoteCollection) {
  return collection === "members"
    ? memberApi
    : collection === "registrations"
      ? registrationApi
      : contentApis[collection];
}
async function loadKey(key: DataKey) {
  if (key === "settings") return settingsApi.get();
  const all: AssociationRecord[] = [];
  for (let page = 1; ; page++) {
    const result = await collectionApi(key).getAll({ limit: 100, page });
    all.push(...result.data);
    if (all.length >= result.pagination.total || !result.data.length)
      return all;
  }
}
function compose(keys: readonly DataKey[]): AssociationData | null {
  const local = readAssociationData();
  for (const key of keys) {
    const value = cache.peek(key);
    if (value === undefined) return null;
    if (key === "settings") local.settings = value as AssociationRecord;
    else local.collections[key] = value as AssociationRecord[];
  }
  return local;
}
export const getCachedAssociationData = compose;
export async function loadAssociationData(keys: readonly DataKey[]) {
  await Promise.all(keys.map((key) => cache.get(key, () => loadKey(key))));
  return compose(keys)!;
}
export function cacheSavedRecord(
  collection: RemoteCollection,
  record: AssociationRecord,
) {
  cache.update(collection, (current) => {
    if (!Array.isArray(current)) return undefined;
    const index = current.findIndex((item) => item.id === record.id);
    return index < 0
      ? [record, ...current]
      : current.map((item) => (item.id === record.id ? record : item));
  });
}
export function cacheDeletedRecord(collection: RemoteCollection, id: string) {
  cache.update(collection, (current) =>
    Array.isArray(current)
      ? current.filter((item) => item.id !== id)
      : undefined,
  );
}
export function cacheSavedSettings(settings: AssociationRecord) {
  cache.update("settings", () => settings);
}
