"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  HeartHandshake,
  Newspaper,
  Plus,
  Users,
  Wallet,
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { useAssociationData } from "@/components/shared/association/useAssociationData";
import {
  formatDate,
  money,
  StatusBadge,
} from "@/components/shared/association/CollectionPage";
import { getValue } from "@/services/association-store";

export default function DashboardPage() {
  const { data, error } = useAssociationData();
  const collections = data?.collections;
  const members = collections?.members || [];
  const fees = collections?.fees || [];
  const paid = fees
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const unpaid = fees
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const sponsorship =
    collections?.sponsorships
      .filter((item) => item.status === "Đã ghi nhận")
      .reduce((sum, item) => sum + Number(item.amount), 0) || 0;
  const upcoming = (collections?.events || [])
    .filter(
      (item) =>
        item.status === "published" &&
        String(getValue(item, "event.date")) >=
          new Date().toLocaleDateString("en-CA", {
            timeZone: "Asia/Ho_Chi_Minh",
          }),
    )
    .sort((a, b) =>
      String(getValue(a, "event.date")).localeCompare(
        String(getValue(b, "event.date")),
      ),
    );
  const stats = [
    {
      label: "Tổng hội viên",
      value: data ? String(members.length).padStart(2, "0") : "—",
      note: `${members.filter((item) => item.status === "active").length} hội viên đang hoạt động`,
      icon: Users,
      tone: "blue",
      href: "/admin/members",
    },
    {
      label: "Hội phí đã thu",
      value: data ? money(paid) : "—",
      note: `${fees.filter((item) => item.status === "paid").length} khoản đã thanh toán`,
      icon: Wallet,
      tone: "green",
      href: "/admin/fees",
    },
    {
      label: "Sự kiện sắp tới",
      value: data ? String(upcoming.length).padStart(2, "0") : "—",
      note: "Chương trình đã công bố",
      icon: CalendarDays,
      tone: "purple",
      href: "/admin/events",
    },
    {
      label: "Giá trị tài trợ",
      value: data ? money(sponsorship) : "—",
      note: "Tiền mặt và hiện vật quy đổi",
      icon: HeartHandshake,
      tone: "orange",
      href: "/admin/sponsorships",
    },
  ];
  return (
    <AppShell>
      <div className="page-stack">
        <div className="page-heading">
          <div>
            <span className="eyebrow">KHÔNG GIAN ĐIỀU HÀNH</span>
            <h1>Tổng quan hoạt động</h1>
            <p>Một góc nhìn chung, để cùng Hội tiến xa hơn.</p>
          </div>
          <Link
            className="button button-primary"
            href="/admin/members"
            prefetch={false}
          >
            <Plus size={17} />
            Quản lý hội viên
          </Link>
        </div>
        <section className="welcome-banner">
          <div className="welcome-content">
            <span className="welcome-label">
              <span /> HỘI DOANH NGHIỆP PHƯỜNG TÂN SƠN
            </span>
            <h2>
              Kết nối doanh nhân.
              <br />
              Đồng hành phát triển.
            </h2>
            <p>Trách nhiệm - Sẵn sàng - Vươn mình</p>
            <Link href="/admin/events" prefetch={false}>
              Khám phá hoạt động của Hội <ArrowRight size={17} />
            </Link>
          </div>
          <div className="welcome-photo">
            <Image
              src="/association/3.jpg"
              alt="Hoạt động kết nối của Hội Doanh nghiệp"
              fill
              priority
              sizes="(max-width: 767px) 100vw, 45vw"
            />
            <div className="photo-caption">
              <span>GẮN KẾT CỘNG ĐỒNG</span>
              <strong>Cùng nhau tạo nên giá trị</strong>
            </div>
          </div>
        </section>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <section className="stats-grid" aria-label="Số liệu tổng quan">
          {stats.map(({ label, value, note, icon: Icon, tone, href }) => (
            <Link
              href={href}
              prefetch={false}
              className={`stat-card stat-card-${tone}`}
              key={label}
            >
              <div className="stat-card-top">
                <span>{label}</span>
                <span className={`stat-icon tone-${tone}`}>
                  <Icon size={20} />
                </span>
              </div>
              <strong className="stat-value">{value}</strong>
              <div className="stat-note">
                <span>{note}</span>
                <ArrowUpRight size={15} />
              </div>
            </Link>
          ))}
        </section>
        <div className="dashboard-columns">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">CỘNG ĐỒNG CỦA CHÚNG TA</span>
                <h2>Hội viên gần đây</h2>
              </div>
              <Link
                href="/admin/members"
                prefetch={false}
                className="text-link"
              >
                Tất cả <ChevronRight size={15} />
              </Link>
            </div>
            <div className="table-scroll">
              <table className="admin-table dashboard-members">
                <thead>
                  <tr>
                    <th>Hội viên</th>
                    <th>Doanh nghiệp</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {[...members]
                    .sort((a, b) =>
                      String(b.joinedAt).localeCompare(String(a.joinedAt)),
                    )
                    .slice(0, 4)
                    .map((member) => (
                      <tr key={member.id}>
                        <td>
                          <Link
                            href="/admin/members"
                            className="record-title"
                            prefetch={false}
                          >
                            <span className="member-avatar">
                              {String(member.initials || "HV")}
                            </span>
                            <span>
                              {String(member.name)}
                              <small>
                                Gia nhập {formatDate(member.joinedAt)}
                              </small>
                            </span>
                          </Link>
                        </td>
                        <td>{String(member.company)}</td>
                        <td>
                          <StatusBadge value={String(member.status)} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!members.length && (
              <p className="empty-state">
                {data ? "Chưa có hội viên." : "Đang tải dữ liệu…"}
              </p>
            )}
            <div className="panel-bottom">
              <Users size={16} />
              <span>
                {members.filter((item) => item.isBoard).length} thành viên trong
                Ban chấp hành
              </span>
              <Link href="/admin/board" prefetch={false}>
                Xem danh sách <ArrowRight size={14} />
              </Link>
            </div>
          </section>
          <section className="panel event-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">LỊCH HOẠT ĐỘNG</span>
                <h2>Sự kiện sắp tới</h2>
              </div>
              <span className="subtle-icon">
                <CalendarDays size={20} />
              </span>
            </div>
            <div className="upcoming-list">
              {upcoming.length ? (
                upcoming.slice(0, 3).map((event) => {
                  const parts = String(getValue(event, "event.date")).split(
                    "-",
                  );
                  return (
                    <Link
                      href="/admin/events"
                      prefetch={false}
                      className="upcoming-event"
                      key={event.id}
                    >
                      <div className="event-date">
                        <span>THÁNG {parts[1]}</span>
                        <strong>{parts[2]}</strong>
                      </div>
                      <div>
                        <span className="event-topic">
                          {String(event.topic || "Sự kiện Hội")}
                        </span>
                        <h3>{String(event.title)}</h3>
                        <p>
                          {String(
                            getValue(event, "event.time") || "Đang cập nhật",
                          )}
                        </p>
                        <p>
                          {String(
                            getValue(event, "event.venue") || "Đang cập nhật",
                          )}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="empty-state">
                  {data ? "Chưa có sự kiện sắp tới." : "Đang tải…"}
                </p>
              )}
            </div>
            <Link
              className="event-all-link"
              href="/admin/events"
              prefetch={false}
            >
              Quản lý lịch sự kiện <ArrowRight size={16} />
            </Link>
          </section>
        </div>
        <div className="dashboard-columns">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">TIN TỪ CỘNG ĐỒNG</span>
                <h2>Nội dung mới nhất</h2>
              </div>
              <Link className="text-link" href="/admin/news" prefetch={false}>
                Quản lý tin <ChevronRight size={15} />
              </Link>
            </div>
            <div className="dashboard-news">
              {(collections?.news || [])
                .slice()
                .sort((a, b) =>
                  String(b.publishedAt).localeCompare(String(a.publishedAt)),
                )
                .slice(0, 3)
                .map((article) => (
                  <Link
                    href="/admin/news"
                    prefetch={false}
                    key={article.id}
                    className="news-row"
                  >
                    <div className="news-thumb">
                      {article.image ? (
                        <Image
                          src={String(article.image)}
                          alt=""
                          fill
                          unoptimized
                          sizes="90px"
                        />
                      ) : (
                        <Newspaper size={25} />
                      )}
                    </div>
                    <div>
                      <span>
                        {String(article.topic)} <i />{" "}
                        {formatDate(article.publishedAt)}
                      </span>
                      <h3>{String(article.title)}</h3>
                      <p>{String(article.summary)}</p>
                    </div>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
            </div>
          </section>
          <div className="dashboard-right-stack">
            <section className="panel fee-overview">
              <div className="panel-heading">
                <h2>Theo dõi hội phí</h2>
                <span className="stat-icon tone-green">
                  <Wallet size={19} />
                </span>
              </div>
              <div className="fee-track">
                <div>
                  <span>
                    <ArrowDownLeft size={15} />
                    Đã thu
                  </span>
                  <strong>{money(paid)}</strong>
                </div>
                <div>
                  <span>
                    <ArrowUpRight size={15} />
                    Chờ thanh toán
                  </span>
                  <strong>{money(unpaid)}</strong>
                </div>
              </div>
              <div
                className="fee-progress"
                role="progressbar"
                aria-label="Tỷ lệ hội phí đã thu"
                aria-valuenow={Math.round((paid / (paid + unpaid || 1)) * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  style={{ width: `${(paid / (paid + unpaid || 1)) * 100}%` }}
                />
              </div>
              <Link className="text-link" href="/admin/fees" prefetch={false}>
                Xem chi tiết khoản thu <ArrowRight size={14} />
              </Link>
            </section>
            <section className="quick-panel">
              <div>
                <span className="quick-icon">
                  <Check size={20} />
                </span>
                <h2>Hồ sơ chờ duyệt</h2>
                <strong>
                  {collections?.registrations.filter(
                    (item) => item.status === "pending",
                  ).length ?? "—"}
                </strong>
              </div>
              <p>Chào đón những kết nối mới trong cộng đồng.</p>
              <Link href="/admin/registrations" prefetch={false}>
                Xem hồ sơ đăng ký <ArrowRight size={16} />
              </Link>
            </section>
          </div>
        </div>
        <div className="local-data-note">
          <span className="live-dot" />
          <p>
            Số liệu hội viên, hồ sơ đăng ký và nội dung lấy từ hệ thống. Hội phí,
            tài trợ và lịch sử tham gia lấy từ dữ liệu trên trình duyệt này.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
