import styles from "./SplitView.module.css";
import type { ReactNode } from "react";

export default function SplitView({ children, detail, detailId, detailLabel = "Details", mapView = false }: {
  children: ReactNode; detail: ReactNode; detailId: string; detailLabel?: string; mapView?: boolean;
}) {
  return <div className={styles.root} data-map-view={mapView}>
    <div className={styles.list}>{children}</div>
    <section id={detailId} aria-label={detailLabel} className={styles.detail}>{detail}</section>
  </div>;
}
