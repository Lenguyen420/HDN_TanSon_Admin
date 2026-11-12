import axiosInstance from "./axiosConfig.ts";
import type {
  ApiRecord,
  ListParams,
  ListResponse,
  RecordPayload,
} from "./types.ts";

const endpoint = "/association/members";
const recordUrl = (id: string) => `${endpoint}/${encodeURIComponent(id)}`;

export const memberApi = {
  getAll: async (params: ListParams = {}) => {
    const response = await axiosInstance.get<ListResponse>(endpoint, {
      params,
    });
    return response.data;
  },
  create: async (data: RecordPayload) => {
    const response = await axiosInstance.post<{ data: ApiRecord }>(
      endpoint,
      data,
    );
    return response.data.data;
  },
  update: async (id: string, data: RecordPayload) => {
    const response = await axiosInstance.put<{ data: ApiRecord }>(
      recordUrl(id),
      data,
    );
    return response.data.data;
  },
  delete: async (id: string) => {
    await axiosInstance.delete(recordUrl(id));
  },
};
