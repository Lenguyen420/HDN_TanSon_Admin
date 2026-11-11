"use client";

import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Factory,
  FileText,
  Newspaper,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CitizenAssistantChat from "@/components/chat/CitizenAssistantChat";
import AppShell from "@/components/layout/AppShell";
import { getBusinesses } from "@/services/businesses";
import { listResource } from "@/services/feedback";
import { getIndustrialParks } from "@/services/industrial-parks";
import { getJobs } from "@/services/jobs";
import { getKnowledgeItems, getUnansweredQuestions } from "@/services/knowledge.service";
import { getLegalDocuments } from "@/services/legal-document";
import { getArticles } from "@/services/news";
import { getOcops } from "@/services/ocops";
import { getStores } from "@/services/stores";
import { getUsers } from "@/services/users";

type ModuleKey =
  | "users"
  | "feedbacks"
  | "news"
  | "legalDocuments"
  | "businesses"
  | "industrialParks"
  | "jobs"
  | "ocops"
  | "stores"
  | "knowledge"
  | "unanswered";

type DashboardCounts = Record<ModuleKey, number>;

type ModuleCard = {
  key: ModuleKey;
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  tone: string;
};

const initialCounts: DashboardCounts = {
  users: 0,
  feedbacks: 0,
  news: 0,
  legalDocuments: 0,
  businesses: 0,
  industrialParks: 0,
  jobs: 0,
  ocops: 0,
  stores: 0,
  knowledge: 0,
  unanswered: 0,
};

const modules: ModuleCard[] = [
  {
    key: "users",
    label: "Người dùng",
    href: "/admin/users",
    description: "Tài khoản công dân và quản trị",
    icon: UserRound,
    tone: "bg-blue-50 text-blue-700 border-blue-100",
  },
  {
    key: "feedbacks",
    label: "Phản ánh",
    href: "/admin/feedbacks",
    description: "Phản ánh, kiến nghị cần xử lý",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    key: "news",
    label: "Tin tức",
    href: "/admin/news",
    description: "Bài viết và thông tin truyền thông",
    icon: Newspaper,
    tone: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    key: "legalDocuments",
    label: "Văn bản",
    href: "/admin/legal-document",
    description: "Văn bản pháp luật đã công bố",
    icon: FileText,
    tone: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    key: "businesses",
    label: "Doanh nghiệp",
    href: "/admin/businesses",
    description: "Hồ sơ doanh nghiệp địa phương",
    icon: Building2,
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    key: "industrialParks",
    label: "Khu công nghiệp",
    href: "/admin/industrial-parks",
    description: "Khu, cụm công nghiệp",
    icon: Factory,
    tone: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    key: "jobs",
    label: "Việc làm",
    href: "/admin/jobs",
    description: "Tin tuyển dụng đang quản lý",
    icon: BriefcaseBusiness,
    tone: "bg-orange-50 text-orange-700 border-orange-100",
  },
  {
    key: "ocops",
    label: "OCOP",
    href: "/admin/ocops",
    description: "Sản phẩm OCOP địa phương",
    icon: ShoppingBag,
    tone: "bg-red-50 text-red-700 border-red-100",
  },
  {
    key: "stores",
    label: "Cửa hàng",
    href: "/admin/stores",
    description: "Điểm bán và website cửa hàng",
    icon: Store,
    tone: "bg-lime-50 text-lime-700 border-lime-100",
  },
  {
    key: "knowledge",
    label: "Chatbot",
    href: "/admin/knowledge",
    description: "Kho tri thức trợ lý công dân",
    icon: Bot,
    tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function countResult<T>(result: PromiseSettledResult<T[]>) {
  return result.status === "fulfilled" ? result.value.length : 0;
}

function totalFromArticles(
  result: PromiseSettledResult<{ total: number; items: unknown[] }>,
) {
  if (result.status !== "fulfilled") return 0;

  return result.value.total || result.value.items.length;
}

function failureCount(results: PromiseSettledResult<unknown>[]) {
  return results.filter((result) => result.status === "rejected").length;
}

function StatPill({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold">{label}</p>
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-3xl font-extrabold">{formatNumber(value)}</p>
    </div>
  );
}

function ModuleTile({
  module,
  count,
}: {
  module: ModuleCard;
  count: number;
}) {
  const Icon = module.icon;

  return (
    <Link
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
      href={module.href}
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl border p-3 ${module.tone}`}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
      </div>

      <p className="mt-5 text-3xl font-extrabold text-blue-950">
        {formatNumber(count)}
      </p>
      <h3 className="mt-2 text-base font-bold text-slate-800">
        {module.label}
      </h3>
      <p className="mt-1 min-h-10 text-sm leading-5 text-slate-500">
        {module.description}
      </p>
    </Link>
  );
}

export default function Dashboard() {
  const [counts, setCounts] = useState<DashboardCounts>(initialCounts);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("-");
  const [errors, setErrors] = useState(0);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    const results = await Promise.allSettled([
      getUsers({ page: 0, size: 100 }),
      listResource("feedbacks"),
      getArticles({ page: 1, limit: 100 }),
      getLegalDocuments({ page: 0, limit: 100 }),
      getBusinesses({ page: 0, size: 100 }),
      getIndustrialParks({ page: 0, size: 100 }),
      getJobs({ page: 0, size: 100 }),
      getOcops({ page: 0, size: 100 }),
      getStores({ page: 0, size: 100 }),
      getKnowledgeItems(),
      getUnansweredQuestions({ page: 1, limit: 100, status: "OPEN" }),
    ]);

    setCounts({
      users: countResult(results[0] as PromiseSettledResult<unknown[]>),
      feedbacks: countResult(results[1] as PromiseSettledResult<unknown[]>),
      news: totalFromArticles(
        results[2] as PromiseSettledResult<{ total: number; items: unknown[] }>,
      ),
      legalDocuments: countResult(results[3] as PromiseSettledResult<unknown[]>),
      businesses: countResult(results[4] as PromiseSettledResult<unknown[]>),
      industrialParks: countResult(results[5] as PromiseSettledResult<unknown[]>),
      jobs: countResult(results[6] as PromiseSettledResult<unknown[]>),
      ocops: countResult(results[7] as PromiseSettledResult<unknown[]>),
      stores: countResult(results[8] as PromiseSettledResult<unknown[]>),
      knowledge: countResult(results[9] as PromiseSettledResult<unknown[]>),
      unanswered:
        results[10].status === "fulfilled"
          ? results[10].value.pagination.total
          : 0,
    });
    setErrors(failureCount(results));
    setLastUpdated(new Date().toLocaleString("vi-VN"));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const totalContent = useMemo(() => {
    return (
      counts.news +
      counts.legalDocuments +
      counts.knowledge +
      counts.ocops +
      counts.stores
    );
  }, [counts]);

  const economicTotal = useMemo(() => {
    return (
      counts.businesses +
      counts.industrialParks +
      counts.jobs +
      counts.ocops +
      counts.stores
    );
  }, [counts]);

  return (
    <AppShell activeHref="/">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[28px] border border-blue-900/10 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />
          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-yellow-200">
                  <Sparkles className="h-4 w-4" />
                  Trung tâm điều hành
                </div>
                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Dashboard quản trị hành chính công
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Theo dõi nhanh dữ liệu người dùng, phản ánh, tin tức, văn bản,
                  doanh nghiệp, việc làm, OCOP, cửa hàng và tri thức chatbot.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={loading}
                  onClick={() => void loadDashboard()}
                  type="button"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  {loading ? "Đang tải..." : "Làm mới"}
                </button>
                <CitizenAssistantChat />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatPill
            className="border-blue-100 bg-blue-50 text-blue-800"
            icon={UserRound}
            label="Người dùng"
            value={counts.users}
          />
          <StatPill
            className="border-emerald-100 bg-emerald-50 text-emerald-800"
            icon={Building2}
            label="Kinh tế địa phương"
            value={economicTotal}
          />
          <StatPill
            className="border-violet-100 bg-violet-50 text-violet-800"
            icon={FileText}
            label="Nội dung công bố"
            value={totalContent}
          />
          <StatPill
            className="border-amber-100 bg-amber-50 text-amber-800"
            icon={Bot}
            label="Câu hỏi chờ xử lý"
            value={counts.unanswered}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                  Tổng quan phân hệ
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                  Dữ liệu đang quản lý
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Cập nhật: <span className="font-semibold">{lastUpdated}</span>
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((module) => (
                <ModuleTile
                  count={counts[module.key]}
                  key={module.key}
                  module={module}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-emerald-700">
                  <BadgeCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-blue-950">
                    Trạng thái dữ liệu
                  </h2>
                  <p className="text-sm text-slate-500">
                    {errors > 0
                      ? `${errors} nguồn dữ liệu chưa phản hồi`
                      : "Tất cả nguồn dữ liệu đã phản hồi"}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <Link
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  href="/admin/feedbacks"
                >
                  Phản ánh cần theo dõi
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                    {formatNumber(counts.feedbacks)}
                  </span>
                </Link>
                <Link
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  href="/admin/jobs"
                >
                  Tin tuyển dụng
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">
                    {formatNumber(counts.jobs)}
                  </span>
                </Link>
                <Link
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  href="/admin/knowledge"
                >
                  Tri thức chatbot
                  <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
                    {formatNumber(counts.knowledge)}
                  </span>
                </Link>
              </div>
            </article>

            <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Thao tác nhanh
              </p>
              <div className="mt-4 grid gap-3">
                <Link
                  className="rounded-xl bg-blue-900 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-800"
                  href="/admin/news"
                >
                  Quản lý tin tức
                </Link>
                <Link
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  href="/admin/businesses"
                >
                  Quản lý doanh nghiệp
                </Link>
                <Link
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  href="/admin/stores"
                >
                  Quản lý cửa hàng
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
