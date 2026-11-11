// Fingerprints identify unchanged demo records from the previous browser store.
// No sample names, contact information or content are shipped in this module.
export const legacySampleRecords: Record<string, Record<string, string>> = {
  members: {
    "member-1": "76d406bc78c0de60",
    "member-2": "12a6dace216d992a",
    "member-3": "c5e53f85e854f8d9",
    "member-4": "3a2c1e1495d49944",
  },
  registrations: {
    "sample-registration-1": "99553eeb7c30de0f",
    "sample-registration-2": "b383a0e44cadebb4",
    "sample-registration-3": "899a9c4628357dd2",
  },
  news: {
    "news-1": "7512350dfd27bf25",
    "news-2": "a78549b5489b8981",
    "news-3": "7bf0d73198f9213d",
  },
  events: {
    "event-1": "a422c0ed54552511",
    "event-2": "b5015591367df43d",
    "event-3": "cb17b00f04fa7a77",
  },
  "member-visits": {
    "visit-1": "e9458bba988b50b6",
    "visit-2": "76b380cbaea30b63",
    "visit-3": "6c16e57ca977b9dc",
  },
  fees: {
    "fee-2026": "d5630801ad80ea39",
    "fee-event": "cee5591c883b85fc",
    "fee-2025": "15b8b1d9330f40f1",
  },
  activities: {
    "activity-1": "ebc24a4b4daa98b7",
    "activity-2": "cbc90979e1a28ca9",
    "activity-3": "fa06925ae465e9a2",
  },
  sponsorships: {
    "sponsor-1": "3fceafd6bf3c7992",
    "sponsor-2": "8bb088d8d3c46a48",
    "sponsor-3": "d75a056065fd9fb8",
  },
  notifications: {
    "notice-1": "b503c19dfcdad625",
    "notice-2": "9da39e3da2826225",
    "notice-3": "1fbda7bd5cda462d",
  },
  banners: {
    "banner-1": "bf1f0c1f8d55b7cf",
    "banner-2": "a2b4f99380cd7fa7",
    "banner-3": "132a11c1fc7b9b05",
  },
};
export const legacySampleSettings: Record<string, string> = {
  introduction: "090e20f8fa4aea3c",
  mission: "d9c576698aec1d49",
  department: "49bc91951d381211",
  address: "6d4013397eceabd5",
  hours: "e27df946d1ab75ae",
  phone: "94a66db8d4bdb3b0",
  email: "7a1782ec26ea7ad8",
  zaloUrl: "ffcaaa853a892ed9",
  assistantGreeting: "fedd8e2fb664fad3",
  assistantQuestions: "2a02b9a39d56569b",
};
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}
export function legacySampleFingerprint(value: unknown): string {
  const text = JSON.stringify(canonical(value)) ?? "undefined";
  let a = 2166136261,
    b = 2654435769;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b ^ text.charCodeAt(i), 2246822519);
  }
  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}
