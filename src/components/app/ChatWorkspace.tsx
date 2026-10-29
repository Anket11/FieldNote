"use client";
import styles from "./ChatWorkspace.module.css";
import { useCallback, useEffect, useId, useRef, useState, type ComponentType } from "react";
import { ArrowUpRight, BookOpen, CheckSquare, ChevronDown, History, Search, X } from "lucide-react";
import { buildDemoResult } from "@/services/research";
import ResearchProvider from "@/store/Provider";
import ChatSidebar from "./ChatSidebar";
import WorkspaceHeader from "./WorkspaceHeader";
import { WorkspaceContext } from "./WorkspaceContext";
import SelectionTools from "./SelectionTools";
import { Notebook, WorkspacePlan } from "./WorkspaceTools";
import { createWorkspace, parseWorkspaces, updateWorkspace, WORKSPACE_STORAGE_KEY, type ResearchSnapshot, type Workspace, type WorkspaceStore } from "@/services/workspaces";

export interface ChatThreadProps {
  threadId: string;
  onTitle: (id: string, title: string, generated?: boolean) => void;
  configured: boolean;
  initialResearch: ResearchSnapshot;
  onSnapshot: (id: string, snapshot: ResearchSnapshot) => void;
}
interface Props { Thread: ComponentType<ChatThreadProps>; configured: boolean }
const library = buildDemoResult();
const keepWorkspaceName = () => {};

function WorkspaceView({ workspace, Thread, configured, update, onSnapshot }: { workspace: Workspace; update: (change: (workspace: Workspace) => Workspace) => void; onSnapshot: ChatThreadProps["onSnapshot"] } & Props) {
  const [view, setView] = useState<"research" | "notebook" | "plan">("research");
  const [title, setTitle] = useState(workspace.title);
  const questions = workspace.research.messages.filter((message) => message.role === "user");
  function openAnswer(id: string) {
    setView("research");
    requestAnimationFrame(() => { const target = document.getElementById(`question-${id}`); target?.scrollIntoView({ block: "start" }); target?.focus({ preventScroll: true }); });
  }
  function requestResearch(type: string, value: string) {
    setView("research");
    requestAnimationFrame(() => document.dispatchEvent(new CustomEvent(type, { detail: { workspaceId: workspace.id, value } })));
  }
  return <WorkspaceContext.Provider value={{ workspace, update }}><div data-workspace-id={workspace.id}>
    <header className={styles.workspaceHeading}><div><p>WORKSPACE</p><input aria-label="Workspace name" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} onBlur={() => { const name = title.trim(); if (name) update((current) => ({ ...current, title: name })); else setTitle(workspace.title); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div><span>Browser workspace</span></header>
    <nav className={styles.tabs} aria-label="Workspace views">{([
      ["research", "Research", Search, questions.length], ["notebook", "Notebook", BookOpen, workspace.entries.length], ["plan", "Plan", CheckSquare, workspace.tasks.filter((task) => !task.done).length],
    ] as const).map(([id, label, Icon, count]) => <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}><Icon size={16} aria-hidden="true" />{label}{count > 0 && <span>{count}</span>}</button>)}</nav>
    <div hidden={view !== "research"}>{questions.length > 0 && <details className={styles.researchIndex}><summary><History size={16} aria-hidden="true" /><span>Research history</span><span className={styles.historyCount}>{questions.length} {questions.length === 1 ? "question" : "questions"}</span><ChevronDown className={styles.historyChevron} size={16} aria-hidden="true" /></summary><ol>{[...questions].reverse().map((question, index) => <li key={question.id}><button type="button" onClick={() => openAnswer(question.id)}><span className={styles.historyNumber} aria-hidden="true">{questions.length - index}</span><span className={styles.historyQuestion}>{typeof question.content === "string" ? question.content : "Research question"}</span><ArrowUpRight size={15} aria-hidden="true" /></button></li>)}</ol></details>}<ResearchProvider result={library}><Thread threadId={workspace.id} onTitle={keepWorkspaceName} configured={configured} initialResearch={workspace.research} onSnapshot={onSnapshot} /></ResearchProvider></div>
    {view === "notebook" && <Notebook onOpenAnswer={openAnswer} onOpenSource={(id) => requestResearch("workspace-open-source", id)} />}
    {view === "plan" && <WorkspacePlan />}
    <SelectionTools onFollowUp={(text) => requestResearch("workspace-follow-up", text)} />
  </div></WorkspaceContext.Provider>;
}

function CreateWorkspace({ onCreate, onClose }: { onCreate: (name: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const inputId = useId();
  useEffect(() => { dialog.current?.showModal(); dialog.current?.querySelector("input")?.focus(); }, []);
  return <dialog ref={dialog} className={styles.dialog} onCancel={onClose} aria-labelledby={`${inputId}-title`}><form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onCreate(name); }}><div className={styles.dialogTitle}><h2 id={`${inputId}-title`}>Create a workspace</h2><button type="button" aria-label="Cancel new workspace" onClick={onClose}><X size={20} /></button></div><p>One place for a project, a topic, or whatever you’re working on.</p><label htmlFor={inputId}>Workspace name</label><input id={inputId} required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Q4 audit, Accounting research" /><div className={styles.dialogActions}><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={!name.trim()}>Create workspace</button></div></form></dialog>;
}

export default function ChatWorkspace({ Thread, configured }: Props) {
  const [store, setStore] = useState<WorkspaceStore | null>(null);
  const [storageError, setStorageError] = useState("");
  const [canSave, setCanSave] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const sidebarId = useId();
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-only saved data after the server render.
      if (raw) setStore(parseWorkspaces(raw));
      else { const workspace = createWorkspace("My research"); setStore({ version: 1, activeId: workspace.id, workspaces: [workspace] }); }
      setCanSave(true);
    } catch { const workspace = createWorkspace("Unsaved workspace"); setStore({ version: 1, activeId: workspace.id, workspaces: [workspace] }); setStorageError("Saved workspaces could not be loaded. Your stored data has not been replaced. Work in this session will not be saved; check browser storage and reload."); }
    const narrow = window.matchMedia("(max-width: 64rem)");
    const adaptSidebar = () => setSidebarOpen(!narrow.matches);
    adaptSidebar(); narrow.addEventListener("change", adaptSidebar);
    return () => narrow.removeEventListener("change", adaptSidebar);
  }, []);
  useEffect(() => {
    if (!store || !canSave) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Report the outcome of writing to external browser storage.
    try { localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(store)); setStorageError(""); }
    catch { setStorageError("Your latest changes could not be saved in this browser. Keep this page open and free browser storage before making more changes."); }
  }, [store, canSave]);
  const onSnapshot = useCallback((id: string, research: ResearchSnapshot) => setStore((current) => current ? updateWorkspace(current, id, (workspace) => ({ ...workspace, research })) : current), []);
  function closeOnMobile() { if (window.matchMedia("(max-width: 64rem)").matches) setSidebarOpen(false); }
  return <main className={styles.root}>
    <WorkspaceHeader sidebarOpen={sidebarOpen} sidebarId={sidebarId} onToggle={() => setSidebarOpen((open) => !open)} />
    {!store ? <p role="status" className={styles.loading}>Opening your workspaces…</p> : <div className={styles.layout} data-sidebar-open={sidebarOpen} data-workspace-open={workspaceOpen}>
      <ChatSidebar id={sidebarId} hidden={!sidebarOpen} workspaceOpen={workspaceOpen} onWorkspaceToggle={() => { if (window.matchMedia("(max-width: 64rem)").matches) setSidebarOpen(false); else setWorkspaceOpen((open) => !open); }} chats={store.workspaces} activeId={store.activeId} onNew={() => setCreating(true)} onSelect={(id) => { setStore((current) => current ? { ...current, activeId: id } : current); closeOnMobile(); }} />
      <div className={styles.content}>{storageError && <p role="alert">{storageError}</p>}{store.workspaces.map((workspace) => <section key={workspace.id} hidden={store.activeId !== workspace.id} aria-label={workspace.title}><WorkspaceView workspace={workspace} Thread={Thread} configured={configured} onSnapshot={onSnapshot} update={(change) => setStore((current) => current ? updateWorkspace(current, workspace.id, change) : current)} /></section>)}</div>
    </div>}
    {creating && <CreateWorkspace onClose={() => setCreating(false)} onCreate={(title) => { const workspace = createWorkspace(title); setStore((current) => current ? { ...current, activeId: workspace.id, workspaces: [...current.workspaces, workspace] } : current); setCreating(false); closeOnMobile(); }} />}
  </main>;
}
