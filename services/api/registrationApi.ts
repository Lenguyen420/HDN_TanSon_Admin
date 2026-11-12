import axiosInstance from "./axiosConfig.ts";
import type {
  ApiRecord,
  ListParams,
  ListResponse,
  RecordPayload,
} from "./types.ts";

const endpoint = "/association/registrations";
const recordUrl = (id: string) => `${endpoint}/${encodeURIComponent(id)}`;

export const registrationApi = {
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
  approve: async (id: string) => {
    const response = await axiosInstance.post<{
      data: { registration: ApiRecord; memberId: string };
    }>(`${recordUrl(id)}/approve`, {});
    return response.data.data;
  },
  reject: async (id: string, reason: string) => {
    const response = await axiosInstance.post<{ data: ApiRecord }>(
      `${recordUrl(id)}/reject`,
      { reason },
    );
    return response.data.data;
  },
};
