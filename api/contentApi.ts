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
    getById: async (id: string) =>
      (await axiosInstance.get<{ data: ApiRecord }>(recordUrl(id))).data.data,
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
export const newsApi = createContentApi("news");
export const eventsApi = createContentApi("events");
export const memberVisitsApi = createContentApi("member-visits");
export const notificationsApi = createContentApi("notifications");
export const bannersApi = createContentApi("banners");
export const contentApis = {
  news: newsApi,
  events: eventsApi,
  "member-visits": memberVisitsApi,
  notifications: notificationsApi,
  banners: bannersApi,
};
