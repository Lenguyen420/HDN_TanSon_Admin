import assert from "node:assert/strict";
import test from "node:test";
import { actionsForStatus, appointmentStatusMeta, formatDateOnly, formatTimestamp } from "../components/appointments/appointment-utils.ts";

test("ánh xạ đầy đủ nhãn và màu cho trạng thái lịch hẹn", () => {
  assert.equal(Object.keys(appointmentStatusMeta).length, 8);
  assert.equal(appointmentStatusMeta.PENDING.label, "Chờ duyệt");
  assert.match(appointmentStatusMeta.COMPLETED.className, /emerald/);
});

test("chỉ trả về action hợp lệ theo trạng thái", () => {
  assert.deepEqual(actionsForStatus("PENDING"), ["approve", "reject", "reschedule"]);
  assert.deepEqual(actionsForStatus("APPROVED"), ["checkIn", "reschedule", "cancel", "noShow"]);
  assert.deepEqual(actionsForStatus("CHECKED_IN"), ["start"]);
  assert.deepEqual(actionsForStatus("IN_SERVICE"), ["complete"]);
  for (const status of ["COMPLETED", "REJECTED", "CANCELLED", "NO_SHOW"] as const) {
    assert.deepEqual(actionsForStatus(status), []);
  }
});

test("ngày thuần không bị chuyển qua UTC", () => {
  assert.equal(formatDateOnly("2026-07-30"), "30/07/2026");
});

test("timestamp hiển thị theo múi giờ Việt Nam", () => {
  assert.match(formatTimestamp("2026-07-30T02:00:00.000Z"), /09:00/);
});
