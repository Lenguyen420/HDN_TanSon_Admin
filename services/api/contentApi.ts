import axiosInstance from "./axiosConfig.ts";
import type {
  ApiRecord,
  ListParams,
  ListResponse,
  RecordPayload,
} from "./types.ts";
export const contentCollections = [
  "news",
  "events",
  "member-visits",
  "notifications",
  "banners",
] as const;
export type ContentCollection = (typeof contentCollections)[number];
export type ContentListParams = ListParams & {
  topic?: string;
  category?: string;
};
function createContentApi(collection: ContentCollection) {
  const endpoint = "/association/" + collection;
  const recordUrl = (id: string) => endpoint + "/" + encodeURIComponent(id);
  return {
    getAll: async (params: ContentListParams = {}) =>
      (await axiosInstance.get<ListResponse>(endpoint, { params })).data,
    create: async (data: RecordPayload) =>
      (await axiosInstance.post<{ data: ApiRecord }>(endpoint, data)).data.data,
    update: async (id: string, data: RecordPayload) =>
      (await axiosInstance.put<{ data: ApiRecord }>(recordUrl(id), data)).data
        .data,
    delete: async (id: string) => {
      await axiosInstance.delete(recordUrl(id));
    },
  };
}
export const contentApis = {
  news: createContentApi("news"),
  events: createContentApi("events"),
  "member-visits": createContentApi("member-visits"),
  notifications: createContentApi("notifications"),
  banners: createContentApi("banners"),
};
