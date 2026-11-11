import { CrudField } from "./Feedback";

export default function parseFieldValue(
  field: CrudField,
  rawValue: FormDataEntryValue | null,
) {
  const value = String(rawValue ?? "").trim();

  if (field.type === "checkbox") {
    return rawValue !== null;
  }

  if (!value && !field.required) {
    return undefined;
  }

  if (field.type === "number") {
    return Number(value);
  }

  if (field.type === "json") {
    return value ? JSON.parse(value) : undefined;
  }

  return value;
}
