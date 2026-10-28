import type { ReactNode } from "react";

interface DetailField { label: string; value: ReactNode; suffix?: ReactNode }
export default function Details({ fields, emptyText = "Not specified", className = "space-y-2" }: {
  fields: DetailField[]; emptyText?: string; className?: string;
}) {
  return <dl className={className}>{fields.map(({ label, value, suffix }) => {
    const missing = value == null || value === "" || (Array.isArray(value) && !value.length);
    return <div key={label}><dt>{label}</dt><dd>{missing ? emptyText : <>
      {Array.isArray(value) ? <ul>{value.map((text, index) => <li key={index}>{text}</li>)}</ul> : value}{suffix}
    </>}</dd></div>;
  })}</dl>;
}
