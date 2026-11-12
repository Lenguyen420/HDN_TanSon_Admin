import axiosInstance from "./axiosConfig.ts";

export const settingsFields = [
  "name",
  "slogan",
  "introduction",
  "introductionVideoUrl",
  "mission",
  "department",
  "address",
  "hours",
  "phone",
  "email",
  "zaloUrl",
  "assistantGreeting",
  "assistantQuestions",
] as const;
export type SettingsPayload = Record<(typeof settingsFields)[number], string>;
export type AssociationSettings = SettingsPayload & {
  id: "association";
  updatedAt: string | null;
  updatedBy: string | null;
};
const endpoint = "/association/settings";
export const settingsApi = {
  get: async () =>
    (await axiosInstance.get<{ data: AssociationSettings }>(endpoint)).data
      .data,
  update: async (data: SettingsPayload) =>
    (await axiosInstance.put<{ data: AssociationSettings }>(endpoint, data))
      .data.data,
};
