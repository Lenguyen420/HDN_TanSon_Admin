import { AdminRecord } from "@/services/feedback";
import { CrudField } from "./Feedback";
import formatDateTimeLocalValue from "./formatDateTimeLocalValue";

export default function getFieldDefaultValue(
  field: CrudField,
  record?: AdminRecord,
) {
  const value = record?.[field.name];

  if (field.type === "datetime-local") {
    return formatDateTimeLocalValue(value);
  }

  if (field.type === "json") {
    return value === undefined || value === null
      ? ""
      : JSON.stringify(value, null, 2);
  }

  return value === undefined || value === null ? "" : String(value);
}
