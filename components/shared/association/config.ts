import {
  CalendarDays,
  Users,
  UserPlus,
  Award,
  Newspaper,
  Handshake,
  Wallet,
  ClipboardCheck,
  HeartHandshake,
  Bell,
  Images,
  Settings2,
  LayoutDashboard,
} from "lucide-react";
import type { Collection } from "@/services/association-store";

export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "topic"
    | "textarea"
    | "email"
    | "tel"
    | "date"
    | "number"
    | "select"
    | "checkbox"
    | "paragraphs"
    | "agenda"
    | "image";
  required?: boolean;
  options?: [string, string][];
  source?: "members" | "events";
  min?: number;
};
export type SectionConfig = {
  collection: Collection;
  title: string;
  singular: string;
  description: string;
  columns: string[];
  fields: Field[];
  boardOnly?: boolean;
};
const status: Field = {
  key: "status",
  label: "Trạng thái",
  type: "select",
  options: [
    ["published", "Đã công bố"],
    ["draft", "Bản nháp"],
  ],
};
const member: Field = {
  key: "memberId",
  label: "Hội viên",
  type: "select",
  source: "members",
  required: true,
};
const article: Field[] = [
  { key: "title", label: "Tiêu đề", required: true },
  { key: "topic", label: "Chuyên mục", type: "topic", required: true },
  { key: "publishedAt", label: "Ngày công bố", type: "date", required: true },
  status,
  { key: "image", label: "Hình ảnh", type: "image" },
  { key: "author", label: "Tác giả" },
  { key: "summary", label: "Tóm tắt", type: "textarea", required: true },
  {
    key: "paragraphs",
    label: "Nội dung (mỗi đoạn một dòng)",
    type: "paragraphs",
    required: true,
  },
];
const memberFields: Field[] = [
  { key: "name", label: "Họ và tên", required: true },
  { key: "company", label: "Doanh nghiệp", required: true },
  { key: "jobTitle", label: "Chức vụ tại doanh nghiệp" },
  { key: "phone", label: "Số điện thoại", type: "tel" },
  { key: "email", label: "Email", type: "email" },
  { key: "birthDate", label: "Ngày sinh", type: "date" },
  { key: "joinedAt", label: "Ngày gia nhập", type: "date", required: true },
  { key: "companyAddress", label: "Địa chỉ doanh nghiệp" },
  {
    key: "status",
    label: "Trạng thái",
    type: "select",
    options: [
      ["active", "Đang hoạt động"],
      ["inactive", "Ngừng hoạt động"],
    ],
  },
  { key: "isBoard", label: "Thành viên Ban chấp hành", type: "checkbox" },
  { key: "position", label: "Vai trò trong Hội", required: true },
];

export const sections: Record<string, SectionConfig> = {
  members: {
    collection: "members",
    title: "Hội viên",
    singular: "hội viên",
    description: "Kết nối và quản lý cộng đồng doanh nghiệp của Hội.",
    columns: ["name", "company", "phone", "joinedAt", "status"],
    fields: memberFields,
  },
  board: {
    collection: "members",
    title: "Ban chấp hành",
    singular: "thành viên Ban chấp hành",
    description: "Thông tin và vai trò của các thành viên Ban chấp hành Hội.",
    columns: ["name", "position", "company", "phone", "status"],
    fields: memberFields,
    boardOnly: true,
  },
  registrations: {
    collection: "registrations",
    title: "Đăng ký hội viên",
    singular: "hồ sơ đăng ký",
    description: "Tiếp nhận hồ sơ và duyệt doanh nghiệp gia nhập Hội.",
    columns: ["fullName", "company", "phone", "date", "status"],
    fields: [
      { key: "fullName", label: "Họ và tên", required: true },
      { key: "company", label: "Tên doanh nghiệp", required: true },
      { key: "taxCode", label: "Mã số thuế" },
      { key: "phone", label: "Điện thoại", type: "tel", required: true },
      { key: "email", label: "Email", type: "email" },
      { key: "birthDate", label: "Ngày sinh", type: "date" },
      { key: "jobTitle", label: "Chức vụ" },
      { key: "companyAddress", label: "Địa chỉ doanh nghiệp" },
      { key: "date", label: "Ngày đăng ký", type: "date", required: true },
      { key: "note", label: "Ghi chú", type: "textarea" },
    ],
  },
  news: {
    collection: "news",
    title: "Tin tức",
    singular: "bài viết",
    description:
      "Biên tập thông tin, câu chuyện và hoạt động của cộng đồng doanh nghiệp.",
    columns: ["title", "topic", "publishedAt", "status"],
    fields: article,
  },
  events: {
    collection: "events",
    title: "Sự kiện",
    singular: "sự kiện",
    description: "Tổ chức các chương trình giao lưu và kết nối doanh nhân.",
    columns: ["title", "event.date", "event.venue", "status"],
    fields: [
      ...article,
      {
        key: "event.date",
        label: "Ngày tổ chức",
        type: "date",
        required: true,
      },
      { key: "event.time", label: "Khung giờ", required: true },
      { key: "event.venue", label: "Địa điểm", required: true },
      { key: "event.address", label: "Địa chỉ", required: true },
      {
        key: "event.agenda",
        label: "Lịch trình (mỗi dòng: giờ | nội dung)",
        type: "agenda",
      },
    ],
  },
  "member-visits": {
    collection: "member-visits",
    title: "Thăm hội viên",
    singular: "chuyến thăm",
    description: "Lắng nghe, chia sẻ và đồng hành cùng doanh nghiệp hội viên.",
    columns: ["title", "visit.company", "visit.date", "status"],
    fields: [
      ...article,
      { key: "visit.company", label: "Doanh nghiệp được thăm", required: true },
      { key: "visit.representative", label: "Người đại diện", required: true },
      { key: "visit.date", label: "Ngày thăm", type: "date", required: true },
      { key: "visit.address", label: "Địa chỉ" },
      { key: "visit.field", label: "Lĩnh vực hoạt động" },
    ],
  },
  fees: {
    collection: "fees",
    title: "Hội phí",
    singular: "khoản hội phí",
    description:
      "Theo dõi khoản thu và tình trạng đóng hội phí của từng hội viên.",
    columns: ["title", "memberId", "year", "amount", "status"],
    fields: [
      member,
      { key: "title", label: "Nội dung thu", required: true },
      { key: "year", label: "Năm", type: "number", min: 2000, required: true },
      {
        key: "amount",
        label: "Số tiền (VNĐ)",
        type: "number",
        min: 1,
        required: true,
      },
      { key: "date", label: "Ngày ghi nhận", type: "date", required: true },
      { key: "reference", label: "Mã tham chiếu", required: true },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        options: [
          ["pending", "Chờ thanh toán"],
          ["paid", "Đã thanh toán"],
        ],
      },
    ],
  },
  activities: {
    collection: "activities",
    title: "Lịch sử tham gia",
    singular: "lượt tham gia",
    description:
      "Theo dõi đăng ký và ghi nhận sự tham gia các hoạt động của Hội.",
    columns: ["memberId", "title", "date", "venue", "status"],
    fields: [
      member,
      {
        key: "eventId",
        label: "Sự kiện",
        type: "select",
        source: "events",
        required: true,
      },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        options: [
          ["registered", "Đã đăng ký"],
          ["attended", "Đã tham gia"],
          ["absent", "Vắng mặt"],
          ["cancelled", "Đã hủy"],
        ],
      },
    ],
  },
  sponsorships: {
    collection: "sponsorships",
    title: "Tài trợ",
    singular: "khoản tài trợ",
    description:
      "Ghi nhận sự đồng hành và đóng góp của doanh nghiệp cho cộng đồng.",
    columns: ["title", "memberId", "date", "amount", "kind", "status"],
    fields: [
      member,
      { key: "title", label: "Chương trình tài trợ", required: true },
      { key: "date", label: "Ngày tài trợ", type: "date", required: true },
      {
        key: "amount",
        label: "Giá trị quy đổi (VNĐ)",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "kind",
        label: "Hình thức",
        type: "select",
        options: [
          ["cash", "Tiền mặt"],
          ["in-kind", "Hiện vật"],
        ],
      },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        options: [
          ["Đã ghi nhận", "Đã ghi nhận"],
          ["Chờ xác nhận", "Chờ xác nhận"],
        ],
      },
      { key: "description", label: "Mô tả đóng góp", type: "textarea" },
    ],
  },
  notifications: {
    collection: "notifications",
    title: "Thông báo",
    singular: "thông báo",
    description: "Soạn nội dung thông báo dành cho hội viên.",
    columns: ["title", "category", "date", "status"],
    fields: [
      { key: "title", label: "Tiêu đề", required: true },
      { key: "category", label: "Danh mục", required: true },
      { key: "date", label: "Ngày thông báo", type: "date", required: true },
      { key: "time", label: "Giờ thông báo" },
      status,
      {
        key: "description",
        label: "Tóm tắt",
        type: "textarea",
        required: true,
      },
      {
        key: "paragraphs",
        label: "Nội dung (mỗi đoạn một dòng)",
        type: "paragraphs",
        required: true,
      },
    ],
  },
  banners: {
    collection: "banners",
    title: "Banner trang chủ",
    singular: "banner",
    description: "Quản lý hình ảnh hoạt động nổi bật trên trang chủ Mini App.",
    columns: ["image", "alt", "order", "status"],
    fields: [
      {
        key: "image",
        label: "Ảnh banner",
        type: "image",
        required: true,
      },
      { key: "alt", label: "Mô tả ảnh", required: true },
      {
        key: "order",
        label: "Thứ tự hiển thị",
        type: "number",
        min: 1,
        required: true,
      },
      {
        key: "status",
        label: "Trạng thái",
        type: "select",
        options: [
          ["active", "Đang hiển thị"],
          ["inactive", "Đã ẩn"],
        ],
      },
    ],
  },
};

export const navigation = [
  { label: "Tổng quan", href: "/", icon: LayoutDashboard, group: "Điều hành" },
  {
    label: "Hội viên",
    href: "/admin/members",
    icon: Users,
    group: "Điều hành",
  },
  {
    label: "Đăng ký hội viên",
    href: "/admin/registrations",
    icon: UserPlus,
    group: "Điều hành",
  },
  {
    label: "Ban chấp hành",
    href: "/admin/board",
    icon: Award,
    group: "Điều hành",
  },
  {
    label: "Tin tức",
    href: "/admin/news",
    icon: Newspaper,
    group: "Nội dung & hoạt động",
  },
  {
    label: "Sự kiện",
    href: "/admin/events",
    icon: CalendarDays,
    group: "Nội dung & hoạt động",
  },
  {
    label: "Thăm hội viên",
    href: "/admin/member-visits",
    icon: Handshake,
    group: "Nội dung & hoạt động",
  },
  {
    label: "Thông báo",
    href: "/admin/notifications",
    icon: Bell,
    group: "Nội dung & hoạt động",
  },
  {
    label: "Banner trang chủ",
    href: "/admin/banners",
    icon: Images,
    group: "Nội dung & hoạt động",
  },
  {
    label: "Hội phí",
    href: "/admin/fees",
    icon: Wallet,
    group: "Hội phí & đóng góp",
  },
  {
    label: "Lịch sử tham gia",
    href: "/admin/activities",
    icon: ClipboardCheck,
    group: "Hội phí & đóng góp",
  },
  {
    label: "Tài trợ",
    href: "/admin/sponsorships",
    icon: HeartHandshake,
    group: "Hội phí & đóng góp",
  },
  {
    label: "Thông tin Hội",
    href: "/admin/settings",
    icon: Settings2,
    group: "Cấu hình",
  },
];

export const labels: Record<string, string> = {
  name: "Hội viên",
  fullName: "Người đăng ký",
  company: "Doanh nghiệp",
  phone: "Điện thoại",
  joinedAt: "Gia nhập",
  position: "Vai trò",
  title: "Tiêu đề / nội dung",
  topic: "Chuyên mục",
  publishedAt: "Ngày công bố",
  "event.date": "Ngày tổ chức",
  "event.venue": "Địa điểm",
  "visit.company": "Doanh nghiệp",
  "visit.date": "Ngày thăm",
  status: "Trạng thái",
  memberId: "Hội viên",
  year: "Năm",
  amount: "Giá trị",
  date: "Ngày ghi nhận",
  venue: "Địa điểm",
  kind: "Hình thức",
  category: "Danh mục",
  image: "Hình ảnh",
  alt: "Mô tả",
  order: "Thứ tự",
};
export const statusLabels: Record<string, string> = {
  active: "Đang hoạt động",
  inactive: "Ngừng hoạt động",
  published: "Đã công bố",
  draft: "Bản nháp",
  pending: "Chờ xử lý",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  paid: "Đã thanh toán",
  registered: "Đã đăng ký",
  attended: "Đã tham gia",
  absent: "Vắng mặt",
  cancelled: "Đã hủy",
  cash: "Tiền mặt",
  "in-kind": "Hiện vật",
};
