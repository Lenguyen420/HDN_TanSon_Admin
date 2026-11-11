import type {
  EmployeeKpiReport,
  KpiReportResponse,
  KpiReportTask,
  KpiReportUserGroup,
} from "@/services/kpi-report";

import {
  EMPTY_VALUE,
  STATUS_META,
  formatDateTime,
  getRoleLabel,
  getUserDisplayName,
  isOverdue,
} from "./format";

type CellValue = string | number;

type Sheet = {
  name: string;
  columns: string[];
  rows: CellValue[][];
};

/** Ký tự điều khiển không hợp lệ trong XML 1.0. */
const XML_CONTROL_CHARS = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]",
  "g",
);
/** Dấu thanh tiếng Việt sau khi chuẩn hoá NFD. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036F]", "g");
/** BOM giúp Excel nhận đúng UTF-8 cho tiếng Việt có dấu. */
const UTF8_BOM = "﻿";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(XML_CONTROL_CHARS, "");
}

function renderCell(value: CellValue, styleId?: string): string {
  const style = styleId ? ` ss:StyleID="${styleId}"` : "";

  if (typeof value === "number") {
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }

  return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function renderSheet(sheet: Sheet): string {
  // Excel giới hạn tên sheet 31 ký tự và cấm : \ / ? * [ ]
  const name = escapeXml(sheet.name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31));
  const columnWidths = sheet.columns
    .map(() => `<Column ss:AutoFitWidth="0" ss:Width="150"/>`)
    .join("");
  const header = `<Row ss:StyleID="header">${sheet.columns
    .map((column) => renderCell(column))
    .join("")}</Row>`;
  const rows = sheet.rows
    .map((row) => `<Row>${row.map((cell) => renderCell(cell)).join("")}</Row>`)
    .join("");

  return `<Worksheet ss:Name="${name}"><Table>${columnWidths}${header}${rows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
}

function buildWorkbook(sheets: Sheet[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Calibri" ss:Size="11"/></Style><Style ss:ID="header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1E3A8A" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/></Style></Styles>${sheets
    .map(renderSheet)
    .join("")}</Workbook>`;
}

function downloadWorkbook(sheets: Sheet[], fileName: string) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([UTF8_BOM, buildWorkbook(sheets)], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const TASK_COLUMNS = [
  "Nhân viên",
  "Tên công việc",
  "Bảng KPI",
  "Deadline",
  "Điểm",
  "Trạng thái",
  "Điểm cộng",
  "Điểm trừ",
  "Ngày nộp",
  "Ngày đánh giá",
  "Quá hạn",
  "Lý do từ chối / Ghi chú",
];

function buildTaskRow(task: KpiReportTask, employeeName: string): CellValue[] {
  return [
    employeeName,
    task.title ?? EMPTY_VALUE,
    task.board?.title ?? EMPTY_VALUE,
    formatDateTime(task.deadline),
    task.points,
    STATUS_META[task.status].label,
    task.earnedPoints,
    task.deductedPoints,
    formatDateTime(task.submittedAt),
    formatDateTime(task.evaluatedAt),
    isOverdue(task) ? "Có" : "Không",
    task.rejectionReason ?? task.incompleteNote ?? "",
  ];
}

function buildSummarySheet(
  groups: KpiReportUserGroup[],
  initialPoints: number,
): Sheet {
  return {
    name: "Tổng hợp",
    columns: [
      "STT",
      "Nhân viên",
      "Tài khoản",
      "Vai trò",
      "Tổng công việc",
      "Hoàn thành",
      "Chưa hoàn thành",
      "Chờ đánh giá",
      "Đã giao",
      "Từ chối nhận",
      "Điểm cộng",
      "Điểm trừ",
      "Điểm khởi tạo",
      "Điểm cuối",
    ],
    rows: groups.map((group, index) => [
      index + 1,
      getUserDisplayName(group.user),
      group.user?.username ?? EMPTY_VALUE,
      getRoleLabel(group.user?.role),
      group.totalTasks,
      group.completed,
      group.incomplete,
      group.submitted,
      group.pending,
      group.rejected,
      group.earned,
      group.deducted,
      initialPoints,
      group.score,
    ]),
  };
}

/** Xuất Excel màn tổng hợp: 1 sheet tổng hợp + 1 sheet chi tiết công việc. */
export function exportSummaryWorkbook(
  report: KpiReportResponse,
  groups: KpiReportUserGroup[],
) {
  const detailSheet: Sheet = {
    name: "Chi tiết công việc",
    columns: TASK_COLUMNS,
    rows: groups.flatMap((group) => {
      const employeeName = getUserDisplayName(group.user);

      return group.tasks.map((task) => buildTaskRow(task, employeeName));
    }),
  };

  downloadWorkbook(
    [buildSummarySheet(groups, report.initialPoints), detailSheet],
    `bao-cao-diem-thang-${report.month}-${report.year}.xls`,
  );
}

/** Xuất Excel riêng cho một nhân viên. */
export function exportEmployeeWorkbook(report: EmployeeKpiReport) {
  const employeeName = getUserDisplayName(report.user);
  const overviewSheet: Sheet = {
    name: "Tổng quan",
    columns: ["Chỉ tiêu", "Giá trị"],
    rows: [
      ["Nhân viên", employeeName],
      ["Tài khoản", report.user?.username ?? EMPTY_VALUE],
      ["Vai trò", getRoleLabel(report.user?.role)],
      ["Số điện thoại", report.user?.phone ?? EMPTY_VALUE],
      ["Kỳ báo cáo", `Tháng ${report.month}/${report.year}`],
      ["Tổng công việc", report.totalTasks],
      ["Hoàn thành", report.completed],
      ["Chưa hoàn thành", report.incomplete],
      ["Chờ đánh giá", report.submitted],
      ["Đã giao", report.pending],
      ["Từ chối nhận", report.rejected],
      ["Điểm khởi tạo", report.initialPoints],
      ["Điểm cộng", report.earned],
      ["Điểm trừ", report.deducted],
      ["Điểm cuối", report.score],
    ],
  };
  const taskSheet: Sheet = {
    name: "Công việc",
    columns: [...TASK_COLUMNS, "Người giao", "Nội dung"],
    rows: report.tasks.map((task) => [
      ...buildTaskRow(task, employeeName),
      getUserDisplayName(task.chairman),
      task.content ?? "",
    ]),
  };

  downloadWorkbook(
    [overviewSheet, taskSheet],
    `bao-cao-diem-${slugify(employeeName) || "nhan-vien"}-thang-${report.month}-${report.year}.xls`,
  );
}
