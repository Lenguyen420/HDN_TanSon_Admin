import http from "./axiosConfig";
export interface Audit {
  action: string;
  actorId: string;
  at: string;
}
export interface Contribution {
  id: string;
  partnerId: string;
  title: string;
  type: "money" | "in_kind";
  paymentMethod: "cash" | "bank_transfer" | null;
  amount: number | null;
  itemName: string;
  quantity: number | null;
  estimatedValue: number | null;
  contributionDate: string;
  description: string;
  eventId: string | null;
  images: string[];
  isPublished: boolean;
  notification?: { status: string; sentAt?: string; error?: string };
  audit?: Audit[];
}
export interface Partner {
  id: string;
  name: string;
  logo: string;
  industry: string;
  description: string;
  address: string;
  website: string;
  memberId: string | null;
  isPublished: boolean;
  totalAmount: number;
  contributionCount: number;
  contributions?: Contribution[];
  selectedContribution?: Contribution | null;
  audit?: Audit[];
}
export type PartnerPayload = Pick<
  Partner,
  | "name"
  | "logo"
  | "industry"
  | "description"
  | "address"
  | "website"
  | "memberId"
  | "isPublished"
>;
export type ContributionPayload = Omit<
  Contribution,
  "id" | "partnerId" | "notification" | "audit"
> & { sendNotification: boolean };
export interface Summary {
  totalPartners: number;
  totalAmount: number;
  contributionCount: number;
  inKindCount: number;
  estimatedValue: number;
  byPartner?: {
    partnerId: string;
    name: string;
    totalAmount: number;
    contributionCount: number;
    inKindCount: number;
    estimatedValue: number;
  }[];
}
export interface List<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
  summary: Summary;
}
export interface PartnerReference {
  id: string;
  name?: string;
  company?: string;
  title?: string;
}
const root = "/association/partners";
export const partnerApi = {
  references: async (
    resource: "members" | "events",
    search: string,
    signal?: AbortSignal,
  ) =>
    (
      await http.get<{ data: PartnerReference[] }>("/association/" + resource, {
        params: { search, page: 1, limit: 20 },
        signal,
      })
    ).data.data,
  reference: async (
    resource: "members" | "events",
    id: string,
    signal?: AbortSignal,
  ) =>
    (
      await http.get<{ data: PartnerReference }>(
        "/association/" + resource + "/" + encodeURIComponent(id),
        { signal },
      )
    ).data.data,
  list: async (params: Record<string, string | number>, signal?: AbortSignal) =>
    (await http.get<List<Partner>>(root, { params, signal })).data,
  detail: async (
    id: string,
    page = 1,
    signal?: AbortSignal,
    contributionId?: string,
  ) =>
    (
      await http.get<{
        data: Partner;
        pagination: List<Partner>["pagination"];
      }>(`${root}/${id}`, {
        params: { page, limit: 20, contributionId },
        signal,
      })
    ).data,
  statistics: async (params: Record<string, string>, signal?: AbortSignal) =>
    (
      await http.get<{ data: Summary }>(root + "/statistics", {
        params,
        signal,
      })
    ).data.data,
  create: async (data: PartnerPayload, requestId: string) =>
    (await http.post(root, { ...data, requestId })).data,
  update: async (id: string, data: Partial<PartnerPayload>) =>
    (await http.patch(root + "/" + id, data)).data,
  remove: async (id: string) => (await http.delete(root + "/" + id)).data,
  createContribution: async (
    id: string,
    data: ContributionPayload,
    requestId: string,
  ) =>
    (
      await http.post(root + "/" + id + "/contributions", {
        ...data,
        requestId,
      })
    ).data,
  updateContribution: async (id: string, data: Partial<ContributionPayload>) =>
    (await http.patch("/association/contributions/" + id, data)).data,
  removeContribution: async (id: string) =>
    (await http.delete("/association/contributions/" + id)).data,
};
export const money = (value: number | null) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value || 0,
  );
