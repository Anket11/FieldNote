import Image from "next/image";
import Link from "next/link";
import ChatIcon from "./ChatIcon";
import styles from "./WorkspaceHeader.module.css";

interface Props { sidebarOpen: boolean; sidebarId: string; onToggle: () => void }
export default function WorkspaceHeader({ sidebarOpen, sidebarId, onToggle }: Props) {
  return <header className={styles.root}>
    <button type="button" className={styles.toggle} aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      aria-expanded={sidebarOpen} aria-controls={sidebarId} onClick={onToggle}><ChatIcon name="sidebar" /></button>
    <h1 className={styles.brand}><Link href="/" aria-label="Research Workspace home"><Image src="/brand/world-bank-institute.svg" width={220} height={48}
      alt="World Bank Group — Institute for Economic Development" priority /></Link><span className={styles.productName}>Research <strong>Workspace</strong></span></h1>
    <span className={styles.mode}><span /> Research workspace</span>
  </header>;
}
