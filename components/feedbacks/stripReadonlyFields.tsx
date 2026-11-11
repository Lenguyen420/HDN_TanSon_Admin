import { AdminRecord } from "@/services/feedback";

export default function stripReadonlyFields(record: AdminRecord) {
  const next: AdminRecord = {};

  for (const [key, value] of Object.entries(record)) {
    if (
      [
        "id",
        "_id",
        "createdAt",
        "updatedAt",
        "creationTime",
        "responseTime",
      ].includes(key)
    ) {
      continue;
    }

    next[key] = value;
  }

  return next;
}
