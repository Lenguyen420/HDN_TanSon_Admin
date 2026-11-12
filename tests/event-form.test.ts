import test from "node:test";
import assert from "node:assert/strict";
import {
  parseTimeRange,
  readTimeRange,
  readAgenda,
  readEventFiles,
} from "../services/event-form.ts";

test("event time selectors read existing ranges and retain the Mini App API format", () => {
  assert.deepEqual(parseTimeRange("8h00 – 11h30"), {
    start: "08:00",
    end: "11:30",
  });
  assert.deepEqual(parseTimeRange("08:00 - 11:00"), {
    start: "08:00",
    end: "11:00",
  });
  assert.deepEqual(parseTimeRange("25:00 - 26:00"), { start: "", end: "" });
  const form = new FormData();
  form.set("event.time:start", "08:15");
  form.set("event.time:end", "11:30");
  assert.equal(readTimeRange(form, "event.time"), "08:15 - 11:30");
  for (const end of ["08:15", "07:30", "", "24:00"]) {
    form.set("event.time:end", end);
    assert.throws(() => readTimeRange(form, "event.time"));
  }
});

test("agenda rows can be empty, sort by time and reject incomplete items", () => {
  const form = new FormData();
  assert.deepEqual(readAgenda(form, "event.agenda"), []);
  form.append("event.agenda:time", "09:00");
  form.append("event.agenda:title", " Nội dung chính ");
  form.append("event.agenda:time", "08:00");
  form.append("event.agenda:title", "Đón tiếp");
  assert.deepEqual(readAgenda(form, "event.agenda"), [
    { time: "08:00", title: "Đón tiếp" },
    { time: "09:00", title: "Nội dung chính" },
  ]);
  form.append("event.agenda:time", "10:00");
  form.append("event.agenda:title", "");
  assert.throws(() => readAgenda(form, "event.agenda"), /mục lịch trình 3/);
});

test("document and minutes editors preserve ids, support optional dates and reject unsafe links", () => {
  const form = new FormData();
  assert.deepEqual(readEventFiles(form, "event.documents"), []);
  form.append("event.documents:id", "document-existing");
  form.append("event.documents:title", " Tài liệu họp ");
  form.append("event.documents:url", "https://example.com/document.pdf");
  form.append("event.documents:date", "2026-11-12");
  const expected = {
    id: "document-existing",
    title: "Tài liệu họp",
    url: "https://example.com/document.pdf",
    publishedAt: "2026-11-12",
  };
  assert.deepEqual(readEventFiles(form, "event.documents"), [expected]);
  form.set("event.documents:date", "");
  assert.equal(
    readEventFiles(form, "event.documents")[0].publishedAt,
    undefined,
  );
  form.set("event.documents:date", "2026-02-30");
  assert.throws(() => readEventFiles(form, "event.documents"), /Ngày công bố/);
  form.set("event.documents:date", "");
  for (const url of [
    "http://example.com/file.pdf",
    "javascript:alert(1)",
    "https://user:secret@example.com/file.pdf",
  ]) {
    form.set("event.documents:url", url);
    assert.throws(() => readEventFiles(form, "event.documents"), /HTTPS/);
  }
});

test("blank optional file rows are ignored and managed uploads are accepted", () => {
  const form = new FormData();
  form.append("event.minutes:id", "optional-row");
  for (const key of ["title", "url", "date"])
    form.append(`event.minutes:${key}`, "");
  assert.deepEqual(readEventFiles(form, "event.minutes"), []);
  form.set("event.minutes:title", "Biên bản");
  form.set(
    "event.minutes:url",
    "/api/v1/public/event-files/00000000-0000-4000-8000-000000000000",
  );
  assert.equal(readEventFiles(form, "event.minutes").length, 1);
  form.set("event.minutes:url", "/other/path");
  assert.throws(() => readEventFiles(form, "event.minutes"));
});
