import type { Citation } from "@/types/research";
import styles from "./SourcesSummary.module.css";
import ChatIcon from "../ChatIcon";

interface Props {
  groups: Citation[][];
  onOpen: (source: Citation) => void;
  loading?: boolean;
}

export default function SourcesSummary({ groups, onOpen, loading = false }: Props) {
  const sources = groups.flatMap((group) => group[0] ? [group[0]] : []);
  return <details className={styles.root} open={loading} aria-label="Answer sources" data-component="SourcesSummary" aria-busy={loading}>
    <summary aria-label={`Sources · ${sources.length}`}><ChatIcon name="sources" /><span>Sources</span><span className={styles.count}>{sources.length}</span><ChatIcon name="chevron" /></summary>
    {sources.length ? <ul className={styles.list}>{sources.map((source) => <li key={source.id}>
      <button className={styles.source} type="button" title={source.title} onClick={() => onOpen(source)}>
        <span className={styles.document}><ChatIcon name="document" /></span><span className={styles.info}><span className={styles.name}>{source.title}</span>
        <span className={styles.meta}>{source.projectTitle} ({source.projectId})</span></span>
      </button>
    </li>)}</ul> : <div className={styles.empty}>{loading && <span className={styles.skeleton} aria-hidden="true" />}<p>{loading ? "No sources yet." : "No sources available for this answer."}</p></div>}
  </details>;
}
