import type { Metadata } from "next";

import GenericAdminPage, {
  type GenericAdminConfig,
} from "@/components/admin/GenericAdminPage";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Admin Meetings",
  description: "Quản lý cuộc họp",
};

const config: GenericAdminConfig = {
  title: "Quản lý cuộc họp",
  eyebrow: "Meetings",
  description: "Tạo, cập nhật và theo dõi lịch họp trong hệ thống.",
  resource: "meetings",
  formOptionsPath: "/meeting-form-options",
  allowDelete: false,
  columns: [
    { key: "id", label: "ID" },
    { key: "title", label: "Tiêu đề" },
    { key: "date", label: "Ngày họp" },
    { key: "mode", label: "Hình thức" },
    { key: "status", label: "Trạng thái" },
    { key: "startTime", label: "Bắt đầu" },
    { key: "endTime", label: "Kết thúc" },
    { key: "host.username", label: "Chủ trì" },
    { key: "room.name", label: "Phòng họp" },
  ],
  fields: [
    {
      name: "title",
      label: "Tiêu đề",
      placeholder: "Tiêu đề cuộc họp",
      required: true,
    },
    {
      name: "date",
      label: "Ngày họp",
      type: "date",
      required: true,
    },
    {
      name: "startTime",
      label: "Giờ bắt đầu",
      type: "time",
      required: true,
    },
    {
      name: "endTime",
      label: "Giờ kết thúc",
      type: "time",
      required: true,
    },
    {
      name: "mode",
      label: "Hình thức",
      type: "select",
      required: true,
      options: [
        { label: "Trực tiếp", value: "IN_PERSON" },
        { label: "Trực tuyến", value: "ONLINE" },
        { label: "Kết hợp", value: "HYBRID" },
      ],
      recordKey: "meetingMode",
      defaultValue: "IN_PERSON",
    },
    {
      name: "status",
      label: "Trạng thái",
      type: "select",
      required: true,
      defaultValue: "SCHEDULED",
      options: [
        { label: "Bản nháp", value: "DRAFT" },
        { label: "Đã lên lịch", value: "SCHEDULED" },
        { label: "Đang diễn ra", value: "IN_PROGRESS" },
        { label: "Đã hoàn thành", value: "COMPLETED" },
        { label: "Đã hủy", value: "CANCELLED" },
      ],
    },
    {
      name: "hostId",
      label: "Người chủ trì",
      type: "select",
      required: true,
      optionSource: "hosts",
      optionLabelKeys: ["name", "username", "email"],
    },
    {
      name: "roomId",
      label: "Phòng họp",
      type: "select",
      optionSource: "rooms",
      optionLabelKeys: ["name"],
      sendEmptyAsNull: true,
    },
    {
      name: "typeId",
      label: "Loại cuộc họp",
      type: "select",
      optionSource: "types",
      optionLabelKeys: ["name"],
      recordKey: "type",
      sendEmptyAsNull: true,
    },
    {
      name: "allDay",
      label: "Họp cả ngày",
      type: "checkbox",
      placeholder: "Họp cả ngày",
    },
    { name: "description", label: "Mô tả", type: "textarea" },
    { name: "agenda", label: "Chương trình họp", type: "textarea" },
    {
      name: "participantIds",
      label: "Người tham gia",
      type: "checkbox-group",
      optionSource: "hosts",
      optionLabelKeys: ["name", "username", "email"],
      recordKey: "participants",
      recordValue: "participant-ids",
    },
    {
      name: "guests",
      label: "Khách mời",
      type: "guest-list",
    },
    {
      name: "votingEnabled",
      label: "Cho phép biểu quyết",
      type: "checkbox",
      defaultValue: true,
      recordKey: "options.voting",
    },
    {
      name: "recordingEnabled",
      label: "Cho phép ghi hình",
      type: "checkbox",
      recordKey: "options.recording",
    },
    {
      name: "attendanceEnabled",
      label: "Bật điểm danh",
      type: "checkbox",
      defaultValue: true,
      recordKey: "options.attendance",
      recordValue: "not-none",
    },
    {
      name: "attendanceMethod",
      label: "Phương thức điểm danh",
      type: "select",
      defaultValue: "QR_CODE",
      recordKey: "options.attendance",
      recordValue: "none-as-default",
      options: [
        { label: "Mã QR", value: "QR_CODE" },
        { label: "Thủ công", value: "MANUAL" },
      ],
    },
    {
      name: "reminderMinutes",
      label: "Nhắc trước JSON",
      type: "json",
      placeholder: "[15, 30]",
      defaultValue: [30, 60],
      recordKey: "options.reminders",
    },
    {
      name: "actualStartAt",
      label: "Thời gian bắt đầu thực tế",
      type: "datetime-local",
    },
    {
      name: "actualEndAt",
      label: "Thời gian kết thúc thực tế",
      type: "datetime-local",
    },
  ],
};

export default function Page() {
  return (
    <AppShell activeHref="/admin/meetings">
      <GenericAdminPage config={config} />
    </AppShell>
  );
}
