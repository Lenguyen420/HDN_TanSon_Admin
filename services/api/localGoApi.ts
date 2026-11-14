import api from "./axiosConfig.ts";
import type { LocalGoCategory, LocalGoMember, LocalGoPlace, PlaceInput } from "../../components/localgo/types.ts";

const endpoint = "/association/localgo";
const placeUrl = (id: string) => `${endpoint}/places/${encodeURIComponent(id)}`;
export const localGoApi = {
  async listPlaces(params: { page: number; limit: number; search?: string; category?: string }, signal?: AbortSignal) {
    return (await api.get<{ data: LocalGoPlace[]; pagination: { page: number; limit: number; total: number } }>(endpoint + "/places", { params, signal })).data;
  },
  async categories(signal?: AbortSignal) {
    return (await api.get<{ data: LocalGoCategory[] }>(endpoint + "/categories", { signal })).data.data;
  },
  async get(id: string) {
    return (await api.get<{ data: LocalGoPlace }>(placeUrl(id))).data.data;
  },
  async save(id: string | null, data: PlaceInput) {
    if (id) await api.patch(placeUrl(id), data);
    else await api.post(endpoint + "/places", data);
  },
  async visibility(id: string, isVisible: boolean, reason = "") {
    if (isVisible) await api.patch(placeUrl(id) + "/visibility", { isVisible: true });
    else await api.patch(placeUrl(id) + "/hide", { reason });
  },
  async remove(id: string) { await api.delete(placeUrl(id)); },
  async member(id: string, signal?: AbortSignal) {
    return (await api.get<{ data: LocalGoMember }>("/association/members/" + encodeURIComponent(id), { signal })).data.data;
  },
};
