import http from "./axiosConfig";
export type FeeStatus =
  "unpaid" | "overdue" | "pending_confirmation" | "paid" | "cancelled";
export const feeLabels: Record<string, string> = {
  draft: "Bản nháp",
  published: "Đang thu",
  closed: "Đã ngừng",
  unpaid: "Chưa đóng",
  overdue: "Quá hạn",
  pending_confirmation: "Chờ xác nhận",
  paid: "Đã đóng",
  cancelled: "Đã hủy",
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  rejected: "Đã từ chối",
};
export interface FeeAudit {
  action: string;
  actorId: string;
  at: string;
  note?: string;
}
export interface FeeSummary {
  total: number;
  paid: number;
  unpaid: number;
  overdue: number;
  pending_confirmation: number;
  cancelled: number;
  paidAmount: number;
  remainingAmount: number;
}
export interface FeeCampaign {
  id: string;
  title: string;
  year: number;
  amount: number;
  dueDate: string;
  description: string;
  paymentInstructions: string;
  target: "all" | "selected";
  targetMemberIds: string[];
  status: "draft" | "published" | "closed";
  summary?: FeeSummary;
}
export type FeePayload = Omit<FeeCampaign, "id" | "summary" | "status"> & {
  status: "draft" | "published";
};
export interface FeePayment {
  id: string;
  amount: number;
  method: string;
  proofUrl: string;
  transactionRef: string;
  note: string;
  status: string;
  createdAt: string;
  confirmedBy?: string;
  confirmedAt?: string;
  audit: FeeAudit[];
}
export interface FeeDue {
  id: string;
  memberId: string;
  amountDue: number;
  paidAmount: number;
  status: FeeStatus;
  paidAt?: string;
  paymentMethod?: string;
  transactionRef?: string;
  member: { id: string; name: string };
  payments: FeePayment[];
  audit: FeeAudit[];
}
export interface FeeList<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number };
}
const root = "/association/membership-fees";
export const membershipFeeApi = {
  list: async (params: Record<string, string | number>, signal?: AbortSignal) =>
    (await http.get<FeeList<FeeCampaign>>(root, { params, signal })).data,
  create: async (payload: FeePayload) => (await http.post(root, payload)).data,
  update: async (
    id: string,
    payload: Partial<FeePayload> | { status: "closed" },
  ) => (await http.patch(root + "/" + encodeURIComponent(id), payload)).data,
  publish: async (id: string) =>
    (await http.post(root + "/" + encodeURIComponent(id) + "/publish", {}))
      .data,
  dues: async (id: string, page: number, signal?: AbortSignal) =>
    (
      await http.get<
        FeeList<FeeDue> & { campaign: FeeCampaign; summary: FeeSummary }
      >(root + "/" + encodeURIComponent(id) + "/dues", {
        params: { page, limit: 20 },
        signal,
      })
    ).data,
  decide: async (id: string, action: "confirm" | "reject", note: string) =>
    (
      await http.post(
        "/association/membership-fee-payments/" +
          encodeURIComponent(id) +
          "/" +
          action,
        { note },
      )
    ).data,
  manual: async (
    id: string,
    payload: {
      transactionRef: string;
      method: string;
      note: string;
      proofUrl: string;
    },
  ) =>
    (
      await http.post(
        "/association/membership-fee-dues/" +
          encodeURIComponent(id) +
          "/manual-payment",
        payload,
      )
    ).data,
  members: async (signal?: AbortSignal) => {
    const members: { id: string; name: string }[] = [];
    for (let page = 1; ; page++) {
      const { data } = await http.get<FeeList<{ id: string; name: string }>>(
        "/association/members",
        { params: { page, limit: 100, status: "active" }, signal },
      );
      members.push(...data.data);
      if (members.length >= data.pagination.total) return members;
      if (!data.data.length) throw new Error("Chưa tải đủ hội viên.");
    }
  },
};
export const feeMoney = (n: number) => n.toLocaleString("vi-VN") + " ₫";
export const feeDate = (s?: string) =>
  s
    ? new Date(s.length === 10 ? s + "T00:00:00+07:00" : s).toLocaleDateString(
        "vi-VN",
        { timeZone: "Asia/Ho_Chi_Minh" },
      )
    : "—";
