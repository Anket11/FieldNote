import type { ResearchTask, ResearchRun } from "@/types/chat";
import styles from "./ResearchProgress.module.css";
import ChatIcon from "./ChatIcon";
export type { ResearchTask } from "@/types/chat";

interface Props {
  status: string;
  tasks?: ResearchTask[];
  activity?: { id: string; label: string; status?: ResearchTask["status"] }[];
  state?: ResearchRun["state"];
}

export default function ResearchProgress({ status, tasks = [], activity = [], state }: Props) {
  const currentStatus = <span className={styles.current} role="status" aria-live="polite"><span className={styles.indicator}><ChatIcon name={state === "completed" ? "check" : state === "failed" || state === "stopped" ? "close" : "spinner"} /></span>{status}</span>;
  return <section className={styles.root} aria-label="Research progress" data-component="ResearchProgress" data-state={state}>
    {activity.length ? <details className={styles.activity}>
      <summary>{currentStatus}<ChatIcon name="chevron" /><span className={styles.srOnly}>Activity</span></summary>
      <ol className={styles.timeline}>{activity.map((event) => <li key={event.id} data-status={event.status}>
        <span className={styles.dot}><ChatIcon name={event.status === "completed" ? "check" : event.status === "running" ? "spinner" : "close"} /></span>
        <span>{event.label}</span><span className={styles.status}>{event.status}</span>
      </li>)}</ol>
    </details> : currentStatus}
    {tasks.length > 0 && <details className={styles.plan}>
      <summary><ChatIcon name="sources" /><span>Plan · {tasks.filter((task) => task.status === "completed").length}/{tasks.length} completed</span><ChatIcon name="chevron" /></summary>
      <ol className={styles.timeline}>{tasks.map((task) => <li key={task.id} data-status={task.status}>
        <span className={styles.dot}><ChatIcon name={task.status === "completed" ? "check" : task.status === "running" ? "spinner" : "chevron"} /></span>
        <span>{task.label}</span><span className={styles.status}>{task.status}</span>
      </li>)}</ol>
    </details>}
  </section>;
}
