import { AdminRecord } from "@/services/feedback";
import { CrudField } from "./Feedback";
import getFieldDefaultValue from "./getFieldDefaultValu";

export default function FieldControl({
  field,
  record,
}: {
  field: CrudField;
  record?: AdminRecord;
}) {
  const defaultValue = getFieldDefaultValue(field, record);

  return (
    <label className="block" key={field.name}>
      <span className="mb-1.5 block text-sm font-semibold text-[#3f454d]">
        {field.label}
      </span>
      {field.type === "checkbox" ? (
        <div className="flex items-start gap-3 rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 py-2.5">
          <input
            className="mt-0.5 h-4 w-4 rounded border-[#b8c2d0] text-[#0d6efd] focus:ring-[#c7defd]"
            defaultChecked={Boolean(record?.[field.name])}
            name={field.name}
            type="checkbox"
          />
          <span className="text-sm leading-5 text-[#526071]">
            Bat truong nay
          </span>
        </div>
      ) : field.type === "textarea" || field.type === "json" ? (
        <textarea
          className="min-h-[110px] w-full resize-y rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 py-2 text-sm leading-6 outline-none transition focus:border-[#0d6efd] focus:bg-white focus:ring-2 focus:ring-[#c7defd]"
          defaultValue={defaultValue}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
        />
      ) : field.type === "select" ? (
        <select
          className="h-10 w-full rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 text-sm outline-none transition focus:border-[#0d6efd] focus:bg-white focus:ring-2 focus:ring-[#c7defd]"
          defaultValue={defaultValue || field.options?.[0]?.value}
          name={field.name}
          required={field.required}
        >
          {field.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="h-10 w-full rounded-md border border-[#d8dee8] bg-[#f8fafc] px-3 text-sm outline-none transition focus:border-[#0d6efd] focus:bg-white focus:ring-2 focus:ring-[#c7defd]"
          defaultValue={defaultValue}
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          type={field.type ?? "text"}
        />
      )}
      {field.helper ? (
        <span className="mt-1.5 block text-xs leading-5 text-[#667085]">
          {field.helper}
        </span>
      ) : null}
    </label>
  );
}
