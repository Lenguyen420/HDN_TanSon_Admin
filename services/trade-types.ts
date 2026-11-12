export type TradeStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "HIDDEN"
  | "REJECTED"
  | "EXPIRED"
  | "ARCHIVED";
export interface TradeCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  requiresPromotionDetails: boolean;
  version: number;
}
export interface TradeImage {
  id: string;
  url: string;
}
export interface TradeActor {
  id: string;
  role: "USER" | "BUSINESS" | "SUPER_ADMIN" | "STAFF";
  status: string;
  displayName: string;
  avatarUrl?: string;
  company?: string;
  memberId?: string | null;
  businessType?: string;
}
export interface TradePost {
  id: string;
  slug: string;
  ownerId: string;
  category: string;
  categoryId: string;
  title: string;
  summary: string;
  description: string;
  purpose: "COMMERCIAL" | "NON_PROFIT";
  priceType?: "FIXED" | "NEGOTIABLE" | "CONTACT" | null;
  price?: number | null;
  priceLabel?: string | null;
  address: string;
  googleMapsUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  contactName: string;
  contactPhone: string;
  contactZalo?: string | null;
  promotionPercent?: number | null;
  promotionStartAt?: string | null;
  promotionEndAt?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  expiresAt?: string | null;
  imageIds: string[];
  images: TradeImage[];
  thumbnailUrl?: string | null;
  status: TradeStatus;
  featured: boolean;
  viewCount: number;
  saveCount: number;
  averageRating: number;
  reviewCount: number;
  rejectedReason?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  saved?: boolean;
  isOwner?: boolean;
  owner?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    businessType?: string;
  } | null;
}
export interface TradeMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface TradeResult<T> {
  success: boolean;
  data: T;
  meta?: TradeMeta;
}
export interface TradeReview {
  id: string;
  tradePostId: string;
  userId: string;
  rating: number;
  content: string;
  status: "PENDING" | "PUBLISHED" | "HIDDEN";
  images: TradeImage[];
  imageIds: string[];
  replyContent?: string | null;
  repliedAt?: string | null;
  createdAt: string;
  user?: { id: string; displayName: string; avatarUrl?: string } | null;
  post?: { id: string; title: string; ownerId: string };
  isAuthor?: boolean;
  replies?: {
    id: string;
    userId: string;
    content: string;
    createdAt: string;
  }[];
}
export interface TradeConversation {
  id: string;
  tradePostId: string;
  customerId: string;
  ownerId: string;
  lastMessageAt: string;
  post?: { id: string; title: string; thumbnailUrl?: string };
  unreadCount: number;
  other?: string;
}
export interface TradeMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}
export interface TradeAnalytics {
  range: { from: string; to: string };
  postCount: number;
  totals: {
    views: number;
    uniqueVisitors: number;
    contactPhone: number;
    contactZalo: number;
    share: number;
    save: number;
  };
  reviews: { count: number; averageRating: number };
  topPosts: { id: string; title: string; views: number }[];
  timeseries: {
    date: string;
    views: number;
    contactPhone: number;
    contactZalo: number;
    share: number;
    save: number;
  }[];
}
export interface TradeNotice {
  id: string;
  type: string;
  tradePostId: string;
  slug: string;
  title: string;
  reason?: string;
  reviewId?: string;
  conversationId?: string;
  createdAt: string;
  read: boolean;
}
export const tradeStatusLabels: Record<string, string> = {
  DRAFT: "Bản nháp",
  PENDING: "Chờ Hội duyệt",
  PUBLISHED: "Đang hiển thị",
  HIDDEN: "Tạm ẩn",
  REJECTED: "Cần bổ sung",
  EXPIRED: "Hết hạn",
  ARCHIVED: "Đã kết thúc",
};
export const businessTypeLabels: Record<string, string> = {
  GENERAL: "Doanh nghiệp đa ngành",
  TEMPLE_MANAGEMENT: "Đơn vị hoạt động cộng đồng",
  RESTAURANT: "Ẩm thực – nhà hàng",
  ACCOMMODATION: "Du lịch – lưu trú",
  GARDEN: "Nông nghiệp – sản phẩm địa phương",
};
export const tradeNoticeLabels: Record<string, string> = {
  TRADE_POST_SUBMITTED: "Có tin giao thương chờ duyệt",
  TRADE_POST_APPROVED: "Tin của doanh nghiệp đã được duyệt",
  TRADE_POST_NEW: "Cơ hội kết nối mới trong Hội",
  TRADE_POST_REJECTED: "Tin cần bổ sung trước khi công bố",
  TRADE_POST_HIDDEN: "Tin đã được tạm ẩn",
  TRADE_POST_UNHIDDEN: "Tin đã hiển thị trở lại",
  TRADE_POST_ARCHIVED: "Tin giao thương đã kết thúc",
  TRADE_POST_DELETED: "Tin giao thương đã được xóa",
  TRADE_POST_FEATURED: "Tin được chọn nổi bật",
  TRADE_POST_SAVED: "Có người quan tâm lưu tin",
  TRADE_REVIEW_RECEIVED: "Có đánh giá mới về tin giao thương",
  TRADE_REVIEW_SUBMITTED: "Có đánh giá mới cần theo dõi",
  TRADE_REVIEW_APPROVED: "Đánh giá đã được hiển thị",
  TRADE_REVIEW_HIDDEN: "Đánh giá đã được ẩn",
  TRADE_REVIEW_DELETED: "Đánh giá đã được xóa",
  TRADE_REVIEW_REPLIED: "Doanh nghiệp đã phản hồi đánh giá",
  TRADE_CONVERSATION_STARTED: "Có người quan tâm muốn kết nối",
};
export const tradePrice = (post: TradePost) =>
  post.purpose === "NON_PROFIT"
    ? "Kết nối cộng đồng"
    : post.priceType === "FIXED" && post.price != null
      ? new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(post.price)
      : post.priceLabel ||
        (post.priceType === "NEGOTIABLE"
          ? "Giá thỏa thuận"
          : "Liên hệ báo giá");
export const tradeQuery = (values: Record<string, unknown> = {}) => {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
  });
  return query.size ? "?" + query.toString() : "";
};
