import {
  legacySampleRecords,
  legacySampleSettings,
  legacySampleFingerprint,
} from "./legacy-sample-cleanup.ts";

export type RecordValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | RecordValue[]
  | { [key: string]: RecordValue };
export type AssociationRecord = { id: string; [key: string]: RecordValue };
export type Collection =
  | "members"
  | "registrations"
  | "news"
  | "events"
  | "member-visits"
  | "fees"
  | "activities"
  | "sponsorships"
  | "notifications"
  | "banners";
export type AssociationData = {
  version: 1;
  updatedAt: string;
  legacySamplesRemoved?: boolean;
  collections: Record<Collection, AssociationRecord[]>;
  settings: AssociationRecord;
};
const STORAGE_KEY = "tanson-association-admin-v1";
const CHANGE_EVENT = "association-data-change";
export function createInitialData(): AssociationData {
  return {
    version: 1,
    updatedAt: "",
    legacySamplesRemoved: true,
    collections: {
      members: [],
      registrations: [],
      news: [],
      events: [],
      "member-visits": [],
      fees: [],
      activities: [],
      sponsorships: [],
      notifications: [],
      banners: [],
    },
    settings: {
      id: "association",
      name: "Hội Doanh nghiệp Phường Tân Sơn",
      slogan: "Trách nhiệm - Sẵn sàng - Vươn mình",
      introduction: "",
      introductionVideoUrl: "",
      mission: "",
      department: "",
      address: "",
      hours: "",
      phone: "",
      email: "",
      zaloUrl: "",
      assistantGreeting: "",
      assistantQuestions: "",
    },
  };
}

export function readAssociationData(): AssociationData {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return createInitialData();
  let data: AssociationData;
  try {
    data = JSON.parse(stored) as AssociationData;
  } catch {
    throw new Error(
      "Dữ liệu trên trình duyệt không hợp lệ. Vui lòng kiểm tra bộ nhớ trước khi tiếp tục.",
    );
  }
  if (
    !data ||
    data.version !== 1 ||
    !data.collections ||
    !data.settings ||
    typeof data.settings !== "object" ||
    Array.isArray(data.settings) ||
    Object.keys(createInitialData().collections).some(
      (key) =>
        !Array.isArray(data.collections[key as Collection]) ||
        data.collections[key as Collection].some(
          (record) =>
            !record ||
            typeof record !== "object" ||
            typeof record.id !== "string",
        ),
    )
  ) {
    throw new Error(
      "Dữ liệu trên trình duyệt không hợp lệ. Vui lòng kiểm tra bộ nhớ trước khi tiếp tục.",
    );
  }
  if (!data.legacySamplesRemoved) {
    const defaults = createInitialData();
    for (const key of Object.keys(defaults.collections) as Collection[]) {
      data.collections[key] = data.collections[key].filter(
        (record) =>
          legacySampleRecords[key]?.[record.id] !==
          legacySampleFingerprint(record),
      );
    }
    for (const [key, hash] of Object.entries(legacySampleSettings)) {
      if (legacySampleFingerprint(data.settings[key]) === hash)
        data.settings[key] = defaults.settings[key] ?? "";
    }
    data.legacySamplesRemoved = true;
    delete (data as AssociationData & { registrationSamplesVersion?: number })
      .registrationSamplesVersion;
    return persistAssociationData(data);
  }
  return data;
}

function persistAssociationData(data: AssociationData) {
  const next = { ...data, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "Không thể lưu dữ liệu. Bộ nhớ trình duyệt đã đầy hoặc đang bị chặn.",
    );
  }
  return next;
}

export function saveAssociationData(data: AssociationData) {
  persistAssociationData(data);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeAssociationData(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) callback();
  };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function saveAssociationRecord(
  collection: Collection,
  record: AssociationRecord,
  context?: AssociationData,
) {
  const data = readAssociationData();
  const records = data.collections[collection];
  if (
    ["fees", "activities", "sponsorships"].includes(collection) &&
    !(context ?? data).collections.members.some(
      (member) => member.id === record.memberId,
    )
  )
    throw new Error("Hội viên không còn tồn tại. Vui lòng tải lại danh sách.");
  if (collection === "activities") {
    if (
      !(context ?? data).collections.events.some(
        (event) => event.id === record.eventId,
      )
    )
      throw new Error("Sự kiện không còn tồn tại. Vui lòng tải lại danh sách.");
    if (
      records.some(
        (item) =>
          item.id !== record.id &&
          item.memberId === record.memberId &&
          item.eventId === record.eventId,
      )
    )
      throw new Error("Hội viên đã có bản ghi tham gia sự kiện này.");
  }
  data.collections[collection] = records.some((item) => item.id === record.id)
    ? records.map((item) => (item.id === record.id ? record : item))
    : [record, ...records];
  saveAssociationData(data);
}

export function removeAssociationRecord(collection: Collection, id: string) {
  const data = readAssociationData();
  if (
    collection === "members" &&
    ["fees", "activities", "sponsorships"].some((key) =>
      data.collections[key as Collection].some((item) => item.memberId === id),
    )
  )
    throw new Error(
      "Hội viên có hội phí, lịch sử tham gia hoặc tài trợ. Hãy chuyển trạng thái ngừng hoạt động để giữ lịch sử.",
    );
  if (
    collection === "events" &&
    data.collections.activities.some((item) => item.eventId === id)
  )
    throw new Error(
      "Sự kiện đã có lịch sử tham gia. Hãy chuyển về bản nháp để giữ lịch sử.",
    );
  data.collections[collection] = data.collections[collection].filter(
    (item) => item.id !== id,
  );
  saveAssociationData(data);
}

export function getValue(record: AssociationRecord, path: string): RecordValue {
  return path
    .split(".")
    .reduce<RecordValue>(
      (value, key) =>
        value && typeof value === "object" && !Array.isArray(value)
          ? value[key]
          : undefined,
      record,
    );
}

export function setValue(
  record: AssociationRecord,
  path: string,
  value: RecordValue,
) {
  const keys = path.split(".");
  let target: { [key: string]: RecordValue } = record;
  for (const key of keys.slice(0, -1)) {
    if (
      !target[key] ||
      typeof target[key] !== "object" ||
      Array.isArray(target[key])
    )
      target[key] = {};
    target = target[key] as { [key: string]: RecordValue };
  }
  target[keys[keys.length - 1]] = value;
}
