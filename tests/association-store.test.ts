import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  createInitialData,
  getValue,
  readAssociationData,
  removeAssociationRecord,
  saveAssociationData,
  saveAssociationRecord,
  setValue,
} from "../services/association-store.ts";
const key = "tanson-association-admin-v1";
const legacy = JSON.parse(
  readFileSync(
    new URL("./fixtures/legacy-browser-data.json", import.meta.url),
    "utf8",
  ),
);
function setupStorage() {
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      dispatchEvent: () => true,
    },
  });
  return storage;
}
function testData() {
  const data = createInitialData();
  data.collections.members = [
    {
      id: "test-member",
      name: "Hội viên kiểm thử",
      company: "Doanh nghiệp kiểm thử",
      status: "active",
    },
  ];
  data.collections.events = [
    {
      id: "test-event",
      title: "Sự kiện kiểm thử",
      event: {
        date: "2026-11-11",
        venue: "Địa điểm kiểm thử",
        agenda: [{ time: "08:00", title: "Đón tiếp" }],
      },
    },
  ];
  data.collections.activities = [
    { id: "test-activity", memberId: "test-member", eventId: "test-event" },
  ];
  data.collections.fees = [
    { id: "test-fee", memberId: "test-member", amount: 1000 },
  ];
  return data;
}
test("khởi tạo danh sách trống, không sinh dữ liệu mẫu và các lần tạo độc lập", () => {
  const first = createInitialData();
  assert.ok(
    Object.values(first.collections).every((items) => items.length === 0),
  );
  assert.equal(first.settings.phone, "");
  assert.equal(first.settings.email, "");
  assert.equal(first.settings.introduction, "");
  first.collections.news.push({ id: "test-news", title: "Nội dung kiểm thử" });
  assert.equal(createInitialData().collections.news.length, 0);
});
test("dọn bản ghi mẫu chưa chỉnh sửa, giữ bản ghi tự nhập và nội dung đã sửa", () => {
  const storage = setupStorage();
  const data = createInitialData();
  delete data.legacySamplesRemoved;
  data.collections.members = [
    legacy.member,
    { ...legacy.member, id: "custom-member", name: "Hội viên tự nhập" },
  ];
  data.collections.fees = [
    legacy.fee,
    { ...legacy.fee, id: "custom-fee", amount: 1234 },
  ];
  data.collections.news = [{ id: "custom-news", title: "Tin đã nhập" }];
  data.settings.phone = legacy.settings.phone;
  data.settings.email = "real-contact@example.org";
  storage.set(key, JSON.stringify(data));
  const cleaned = readAssociationData();
  assert.deepEqual(
    cleaned.collections.members.map((item) => item.id),
    ["custom-member"],
  );
  assert.deepEqual(
    cleaned.collections.fees.map((item) => item.id),
    ["custom-fee"],
  );
  assert.equal(cleaned.collections.news[0].title, "Tin đã nhập");
  assert.equal(cleaned.settings.phone, "");
  assert.equal(cleaned.settings.email, "real-contact@example.org");
  assert.equal(cleaned.legacySamplesRemoved, true);
  assert.equal(readAssociationData().collections.members.length, 1);
  const modified = createInitialData();
  delete modified.legacySamplesRemoved;
  modified.collections.members = [
    { ...legacy.member, name: "Hồ sơ đã chỉnh sửa" },
  ];
  storage.set(key, JSON.stringify(modified));
  assert.equal(
    readAssociationData().collections.members[0].name,
    "Hồ sơ đã chỉnh sửa",
  );
});
test("không tự thêm lại hồ sơ mẫu khi đọc dữ liệu trình duyệt cũ", () => {
  const storage = setupStorage();
  const data = createInitialData();
  delete data.legacySamplesRemoved;
  storage.set(key, JSON.stringify({ ...data, registrationSamplesVersion: 1 }));
  assert.equal(readAssociationData().collections.registrations.length, 0);
  assert.equal(readAssociationData().collections.members.length, 0);
  assert.equal(readAssociationData().collections.registrations.length, 0);
});
test("bảo toàn lịch sử tài chính và tham gia khi xóa dữ liệu liên quan", () => {
  setupStorage();
  saveAssociationData(testData());
  assert.throws(
    () => removeAssociationRecord("members", "test-member"),
    /giữ lịch sử/,
  );
  assert.throws(
    () => removeAssociationRecord("events", "test-event"),
    /giữ lịch sử/,
  );
  assert.equal(readAssociationData().collections.members.length, 1);
});
test("cập nhật nội dung lồng nhau giữ nguyên lịch trình", () => {
  setupStorage();
  saveAssociationData(testData());
  const event = readAssociationData().collections.events[0];
  const agenda = getValue(event, "event.agenda");
  setValue(event, "event.venue", "Địa điểm mới");
  saveAssociationRecord("events", event);
  assert.equal(
    getValue(readAssociationData().collections.events[0], "event.venue"),
    "Địa điểm mới",
  );
  assert.deepEqual(
    getValue(readAssociationData().collections.events[0], "event.agenda"),
    agenda,
  );
});
test("bộ nhớ hỏng được báo lỗi và không bị ghi đè", () => {
  const storage = setupStorage();
  storage.set(key, '{"version":1}');
  assert.throws(() => readAssociationData(), /không hợp lệ/);
  assert.throws(
    () => saveAssociationRecord("news", { id: "test" }),
    /không hợp lệ/,
  );
  assert.equal(storage.get(key), '{"version":1}');
});
test("báo lưu thất bại khi hết dung lượng", () => {
  setupStorage();
  window.localStorage.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.throws(
    () => saveAssociationData(createInitialData()),
    /Không thể lưu dữ liệu/,
  );
});
test("kiểm tra liên kết theo hội viên từ API mà không lưu bản sao hội viên cục bộ", () => {
  setupStorage();
  const context = testData();
  saveAssociationRecord(
    "fees",
    { id: "remote-fee", memberId: "test-member", amount: 1000 },
    context,
  );
  assert.equal(readAssociationData().collections.fees.length, 1);
  assert.equal(readAssociationData().collections.members.length, 0);
  assert.throws(
    () =>
      saveAssociationRecord(
        "fees",
        { id: "invalid", memberId: "missing" },
        context,
      ),
    /không còn tồn tại/,
  );
  saveAssociationData(testData());
  assert.throws(
    () =>
      saveAssociationRecord("activities", {
        id: "duplicate",
        memberId: "test-member",
        eventId: "test-event",
      }),
    /đã có bản ghi/,
  );
});
