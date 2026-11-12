"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Menu,
  PanelLeftClose,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import LogoutButton from "@/components/auth/LogoutButton";
import { getStoredAdminUser } from "@/services/api/authSession";
import { navigation } from "@/components/shared/association/config";

export default function AppShell({
  activeHref = "/",
  children,
}: {
  activeHref?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("Quản trị viên");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const user = getStoredAdminUser();
      setName(user?.name || user?.username || "Quản trị viên");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const current = navigation.find((item) => item.href === activeHref);
  const groups = [...new Set(navigation.map((item) => item.group))];
  const filtered = navigation.filter((item) =>
    item.label.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <div className="admin-layout">
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="Đóng điều hướng"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`admin-sidebar ${open ? "is-open" : ""}`}
        aria-label="Điều hướng quản trị"
        id="admin-sidebar"
      >
        <Link href="/" className="sidebar-brand" prefetch={false}>
          <Image
            src="/association/logo.jpg"
            alt="Logo Hội Doanh nghiệp Phường Tân Sơn"
            width={48}
            height={48}
            priority
          />
          <span>
            <strong>HỘI DOANH NGHIỆP</strong>
            <span>PHƯỜNG TÂN SƠN</span>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="live-dot" /> Không gian quản trị{" "}
          <button
            className="mobile-close icon-button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {navigation
                .filter((item) => item.group === group)
                .map(({ label, href, icon: Icon }) => (
                  <Link
                    href={href}
                    prefetch={false}
                    key={href}
                    aria-current={activeHref === href ? "page" : undefined}
                    className={`nav-link ${activeHref === href ? "active" : ""}`}
                    onClick={() => setOpen(false)}
                  >
                    <Icon size={18} strokeWidth={1.8} />
                    <span>{label}</span>
                    {activeHref === href && <ChevronRight size={15} />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={20} />
          <div>
            <strong>Kết nối để cùng phát triển</strong>
            <p>Trách nhiệm · Sẵn sàng · Vươn mình</p>
          </div>
        </div>
      </aside>
      <div className="admin-workspace">
        <a href="#main-content" className="skip-link">
          Đến nội dung chính
        </a>
        <header className="admin-topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Mở menu"
              aria-expanded={open}
              aria-controls="admin-sidebar"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-home">Quản trị Hội</span>
            <ChevronRight size={14} />
            <strong>{current?.label || "Tổng quan"}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-badge">
              <span />
              Quản trị Hội
            </span>
            <div className="user-avatar" aria-hidden="true">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="topbar-user">
              <strong>{name}</strong>
              <span>Ban thư ký Hội</span>
            </div>
            <LogoutButton />
          </div>
        </header>
        <div className="workspace-toolbar">
          <p>Trách nhiệm - Sẵn sàng - Vươn mình</p>
          <div className="nav-search">
            <Search size={16} />
            <input
              aria-label="Tìm chức năng"
              placeholder="Tìm chức năng quản trị…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button aria-label="Xóa tìm kiếm" onClick={() => setQuery("")}>
                <X size={14} />
              </button>
            )}
            {query && (
              <div className="nav-search-results">
                {filtered.length ? (
                  filtered.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setQuery("")}
                    >
                      <item.icon size={16} />
                      {item.label}
                      <ChevronRight size={14} />
                    </Link>
                  ))
                ) : (
                  <p>Không tìm thấy chức năng.</p>
                )}
              </div>
            )}
          </div>
        </div>
        <main id="main-content" className="admin-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="admin-footer">
          <span>Hội Doanh nghiệp Phường Tân Sơn</span>
        </footer>
      </div>
    </div>
  );
}
