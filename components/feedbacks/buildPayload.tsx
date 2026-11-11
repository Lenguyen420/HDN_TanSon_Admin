import { AdminRecord } from "@/services/feedback";
import { CrudField } from "./Feedback";
import parseFieldValue from "./parseFieldValue";

export default function buildPayload(fields: CrudField[], formData: FormData) {
  return fields.reduce<AdminRecord>((payload, field) => {
    const value = parseFieldValue(field, formData.get(field.name));

    if (value !== undefined) {
      payload[field.name] = value;
    }

    return payload;
  }, {});
}
