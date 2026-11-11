"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import {
  createJob,
  createJobApplication,
  deleteJob,
  getJobApplications,
  getJobById,
  getJobInteractions,
  getJobs,
  recordJobView,
  updateJob,
  updateJobLike,
  type Job,
  type JobApplication,
  type JobInteraction,
} from "@/services/jobs";

type JobForm = {
  title: string;
  zoneId: string;
  salary: string;
  workType: string;
  deadline: string;
  views: string;
  jobDescription: string;
};

type ApplicationForm = {
  userId: string;
  fullName: string;
  phone: string;
  email: string;
  cvUrl: string;
  coverLetter: string;
  note: string;
};

const initialJobForm: JobForm = {
  title: "",
  zoneId: "",
  salary: "",
  workType: "Toàn thời gian",
  deadline: "",
  views: "",
  jobDescription: "",
};

const initialApplicationForm: ApplicationForm = {
  userId: "",
  fullName: "",
  phone: "",
  email: "",
  cvUrl: "",
  coverLetter: "",
  note: "",
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white focus:ring-4 focus:ring-blue-100";

function getText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);

  return "";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;

  return "Có lỗi xảy ra.";
}

function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function formatDateTimeInput(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function parseOptionalNumber(value: string) {
  const text = value.trim();

  if (!text) return undefined;

  const number = Number(text);

  return Number.isNaN(number) ? undefined : number;
}

function getJobDescription(job: Job) {
  return getText(job.jobDescription) || getText(job.description);
}

function getZoneText(job: Job) {
  return getText(job.zone?.name) || getText(job.zoneId) || "-";
}

function getApplicationName(application: JobApplication) {
  return (
    getText(application.fullName) ||
    getText(application.name) ||
    getText(application.userId) ||
    "Ứng viên"
  );
}

function getApplicationCvUrl(application: JobApplication) {
  return (
    getText(application.cvUrl) ||
    getText(application.resumeUrl) ||
    getText(application.fileUrl)
  );
}

function buildJobPayload(form: JobForm) {
  return {
    title: form.title.trim(),
    zoneId: form.zoneId.trim() || undefined,
    salary: form.salary.trim() || undefined,
    workType: form.workType.trim() || undefined,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
    views: parseOptionalNumber(form.views),
    jobDescription: form.jobDescription.trim() || undefined,
  };
}

export default function JobsAdminPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<JobForm>(initialJobForm);
  const [applicationForm, setApplicationForm] = useState<ApplicationForm>(
    initialApplicationForm,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [interactions, setInteractions] = useState<JobInteraction[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [keyword, setKeyword] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [workType, setWorkType] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalViews = useMemo(
    () => jobs.reduce((total, job) => total + (Number(job.views) || 0), 0),
    [jobs],
  );

  const jobsWithDeadline = useMemo(
    () => jobs.filter((job) => Boolean(job.deadline)).length,
    [jobs],
  );

  const loadJobs = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getJobs({
        page: 0,
        size: 100,
        keyword: keyword.trim() || undefined,
        zoneId: zoneId.trim() || undefined,
        workType: workType.trim() || undefined,
      });
      setJobs(data);
    } catch (error) {
      alert(`Không thể tải danh sách việc làm: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, [keyword, workType, zoneId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadJobs]);

  const handleChange = (field: keyof JobForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplicationChange = (
    field: keyof ApplicationForm,
    value: string,
  ) => {
    setApplicationForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialJobForm);
    setEditingId(null);
  };

  const handleEdit = (job: Job) => {
    setEditingId(job.id);
    setForm({
      title: getText(job.title),
      zoneId: getText(job.zoneId),
      salary: getText(job.salary),
      workType: getText(job.workType) || "Toàn thời gian",
      deadline: formatDateTimeInput(job.deadline),
      views: getText(job.views),
      jobDescription: getJobDescription(job),
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Vui lòng nhập tiêu đề việc làm.");
      return;
    }

    setSaving(true);

    try {
      const payload = buildJobPayload(form);

      if (editingId) {
        await updateJob(editingId, payload);
      } else {
        await createJob(payload);
      }

      resetForm();
      await loadJobs();
    } catch (error) {
      alert(`Không thể lưu việc làm: ${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Bạn có chắc muốn xóa việc làm này không?",
    );

    if (!confirmed) return;

    try {
      await deleteJob(id);
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setInteractions([]);
        setApplications([]);
      }
      await loadJobs();
    } catch (error) {
      alert(`Không thể xóa việc làm: ${getErrorMessage(error)}`);
    }
  };

  const handleViewDetail = async (job: Job) => {
    setDetailLoading(true);

    try {
      const [detail, nextInteractions, nextApplications] = await Promise.all([
        getJobById(job.id),
        getJobInteractions(job.id),
        getJobApplications(job.id),
      ]);
      setSelectedJob(detail);
      setInteractions(nextInteractions);
      setApplications(nextApplications);
    } catch (error) {
      alert(`Không thể tải chi tiết việc làm: ${getErrorMessage(error)}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRecordView = async (job: Job) => {
    try {
      await recordJobView(job.id, {});
      await loadJobs();
      if (selectedJob?.id === job.id) {
        await handleViewDetail(job);
      }
    } catch (error) {
      alert(`Không thể ghi nhận lượt xem: ${getErrorMessage(error)}`);
    }
  };

  const handleToggleLike = async (job: Job) => {
    try {
      await updateJobLike(job.id, { liked: true });
      if (selectedJob?.id === job.id) {
        await handleViewDetail(job);
      }
    } catch (error) {
      alert(`Không thể cập nhật thích việc làm: ${getErrorMessage(error)}`);
    }
  };

  const handleCreateApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedJob) return;

    try {
      await createJobApplication(selectedJob.id, {
        userId: applicationForm.userId.trim() || undefined,
        fullName: applicationForm.fullName.trim() || undefined,
        phone: applicationForm.phone.trim() || undefined,
        email: applicationForm.email.trim() || undefined,
        cvUrl: applicationForm.cvUrl.trim() || undefined,
        coverLetter: applicationForm.coverLetter.trim() || undefined,
        note: applicationForm.note.trim() || undefined,
      });

      setApplicationForm(initialApplicationForm);
      await handleViewDetail(selectedJob);
    } catch (error) {
      alert(`Không thể tạo hồ sơ ứng tuyển: ${getErrorMessage(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-blue-900/10 bg-white shadow-sm">
          <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

          <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-6 text-white">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-yellow-200">
                  Việc làm địa phương
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
                  Quản lý tuyển dụng
                </h1>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">
                  Quản lý tin tuyển dụng, khu vực tuyển dụng, lượt xem, tương
                  tác và hồ sơ ứng tuyển.
                </p>
              </div>

              <button
                type="button"
                onClick={loadJobs}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-400 px-5 py-3 text-sm font-bold text-blue-950 shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang tải dữ liệu..." : "Làm mới dữ liệu"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Tổng tin
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {jobs.length}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tin tuyển dụng đang quản lý
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-700">
              Lượt xem
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {totalViews}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Tổng lượt xem từ dữ liệu hiện có
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">
              Có hạn nộp
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-950">
              {jobsWithDeadline}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Tin đã khai báo hạn ứng tuyển
            </p>
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
              Thông tin việc làm
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-blue-950">
              {editingId ? "Cập nhật việc làm" : "Thêm việc làm"}
            </h2>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-5 p-6 lg:grid-cols-2"
          >
            <div>
              <label className="text-sm font-bold text-slate-700">
                Tiêu đề <span className="text-red-600">*</span>
              </label>
              <input
                value={form.title}
                onChange={(event) => handleChange("title", event.target.value)}
                placeholder="VD: Tuyển dụng kỹ sư sản xuất"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Zone ID
              </label>
              <input
                value={form.zoneId}
                onChange={(event) => handleChange("zoneId", event.target.value)}
                placeholder="Nhập zoneId"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Mức lương
              </label>
              <input
                value={form.salary}
                onChange={(event) => handleChange("salary", event.target.value)}
                placeholder="VD: 15-20 triệu"
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Hình thức làm việc
              </label>
              <select
                value={form.workType}
                onChange={(event) =>
                  handleChange("workType", event.target.value)
                }
                className={inputClassName}
              >
                <option value="Toàn thời gian">Toàn thời gian</option>
                <option value="Bán thời gian">Bán thời gian</option>
                <option value="Thực tập">Thực tập</option>
                <option value="Theo ca">Theo ca</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Hạn nộp
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(event) =>
                  handleChange("deadline", event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Lượt xem ban đầu
              </label>
              <input
                type="number"
                min={0}
                value={form.views}
                onChange={(event) => handleChange("views", event.target.value)}
                placeholder="VD: 100"
                className={inputClassName}
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-sm font-bold text-slate-700">
                Mô tả công việc
              </label>
              <textarea
                value={form.jobDescription}
                onChange={(event) =>
                  handleChange("jobDescription", event.target.value)
                }
                placeholder="Nhập mô tả công việc"
                rows={4}
                className={inputClassName}
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5 lg:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-900 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Đang lưu..."
                  : editingId
                    ? "Cập nhật việc làm"
                    : "Thêm mới việc làm"}
              </button>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Hủy chỉnh sửa
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 border-b border-slate-100 px-6 py-5 lg:grid-cols-[1fr_260px_220px_auto] lg:items-end">
            <div>
              <label className="text-sm font-bold text-slate-700">
                Từ khóa
              </label>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Tìm theo công nghệ, kỹ sư..."
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">
                Zone ID
              </label>
              <input
                value={zoneId}
                onChange={(event) => setZoneId(event.target.value)}
                placeholder="Lọc zoneId"
                className={inputClassName}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-slate-700">
                Hình thức
              </label>
              <input
                value={workType}
                onChange={(event) => setWorkType(event.target.value)}
                placeholder="Toàn thời gian"
                className={inputClassName}
              />
            </div>
            <button
              type="button"
              onClick={loadJobs}
              className="rounded-xl bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
            >
              Lọc
            </button>
          </div>

          <div className="overflow-x-auto p-6">
            <table className="w-full min-w-[1300px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="bg-blue-950 text-white">
                  <th className="rounded-l-xl px-4 py-4 font-bold">ID</th>
                  <th className="px-4 py-4 font-bold">Vị trí</th>
                  <th className="px-4 py-4 font-bold">Khu vực</th>
                  <th className="px-4 py-4 font-bold">Lương</th>
                  <th className="px-4 py-4 font-bold">Hình thức</th>
                  <th className="px-4 py-4 font-bold">Lượt xem</th>
                  <th className="px-4 py-4 font-bold">Hạn nộp</th>
                  <th className="rounded-r-xl px-4 py-4 font-bold">Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Đang tải dữ liệu việc làm...
                    </td>
                  </tr>
                ) : null}

                {!loading && jobs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      Chưa có tin tuyển dụng nào.
                    </td>
                  </tr>
                ) : null}

                {!loading
                  ? jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="text-slate-700 transition hover:bg-blue-50/60"
                      >
                        <td className="max-w-[170px] border-b border-slate-100 px-4 py-4 text-xs text-slate-500">
                          <span className="block truncate">{job.id}</span>
                        </td>
                        <td className="min-w-[280px] border-b border-slate-100 px-4 py-4">
                          <div className="font-bold text-blue-950">
                            {getText(job.title) || "-"}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {getJobDescription(job)}
                          </div>
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          {getZoneText(job)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-800">
                          {getText(job.salary) || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          {getText(job.workType) || "-"}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          {job.views ?? 0}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 text-slate-500">
                          {formatDateTime(job.deadline)}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewDetail(job)}
                              className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-800 transition hover:bg-blue-50"
                            >
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRecordView(job)}
                              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              +View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLike(job)}
                              className="rounded-lg border border-yellow-200 bg-white px-3 py-2 text-xs font-bold text-yellow-700 transition hover:bg-yellow-50"
                            >
                              Like
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(job)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                              Sửa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(job.id)}
                              className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
        </section>

        {selectedJob ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          >
            <div
              className="relative max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="h-2 bg-gradient-to-r from-red-700 via-yellow-400 to-blue-900" />

              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                      Chi tiết việc làm
                    </p>

                    <h2 className="mt-2 text-xl font-extrabold text-blue-950">
                      {getText(selectedJob.title)}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      {getJobDescription(selectedJob)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedJob(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-700"
                    aria-label="Đóng popup chi tiết"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="max-h-[calc(90vh-110px)] overflow-y-auto p-6">
                {detailLoading ? (
                  <p className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
                    Đang tải chi tiết...
                  </p>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Tương tác
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-blue-950">
                      {interactions.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Ứng tuyển
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-blue-950">
                      {applications.length}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase text-slate-500">
                      Lượt xem
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-blue-950">
                      {selectedJob.views ?? 0}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-extrabold text-blue-950">
                      Danh sách tương tác
                    </h3>

                    <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200">
                      {interactions.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          Chưa có tương tác nào.
                        </p>
                      ) : (
                        interactions.map((item, index) => (
                          <div
                            key={item.id ?? `${item.userId}-${index}`}
                            className="border-b border-slate-100 p-4 text-sm last:border-b-0"
                          >
                            <div className="font-bold text-slate-800">
                              {item.userId ?? "Không rõ người dùng"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              Liked:{" "}
                              {String(item.liked ?? item.isLiked ?? false)} ·
                              Views: {item.viewCount ?? "-"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-blue-950">
                      Hồ sơ ứng tuyển
                    </h3>

                    <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-slate-200">
                      {applications.length === 0 ? (
                        <p className="p-4 text-sm text-slate-500">
                          Chưa có hồ sơ ứng tuyển.
                        </p>
                      ) : (
                        applications.map((item, index) => (
                          <div
                            key={item.id ?? `${item.email}-${index}`}
                            className="border-b border-slate-100 p-4 text-sm last:border-b-0"
                          >
                            <div className="font-bold text-slate-800">
                              {getApplicationName(item)}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {item.phone ?? ""}{" "}
                              {item.email ? `· ${item.email}` : ""}
                            </div>

                            {getApplicationCvUrl(item) ? (
                              <a
                                href={getApplicationCvUrl(item)}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900"
                              >
                                Mở CV
                              </a>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
