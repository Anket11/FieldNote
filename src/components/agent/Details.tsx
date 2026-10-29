import styles from "./Details.module.css";
import type { ReactNode } from "react";

interface DetailField { label: string; value: ReactNode; suffix?: ReactNode }
export default function Details({ fields, emptyText = "Not specified", className = "" }: {
  fields: DetailField[]; emptyText?: string; className?: string;
}) {
  return <dl className={`${styles.root} ${className}`}>{fields.map(({ label, value, suffix }) => {
    const missing = value == null || value === "" || (Array.isArray(value) && !value.length);
    return <div key={label} className={styles.item}><dt className={styles.label}>{label}</dt><dd className={styles.value}>{missing ? emptyText : <>
      {Array.isArray(value) ? <ul>{value.map((text, index) => <li key={index}>{text}</li>)}</ul> : value}{suffix}
    </>}</dd></div>;
  })}</dl>;
}
