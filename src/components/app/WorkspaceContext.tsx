import { createContext, useContext } from "react";
import type { Workspace } from "@/services/workspaces";
export const WorkspaceContext = createContext<{ workspace: Workspace; update: (change: (workspace: Workspace) => Workspace) => void } | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider is missing.");
  return value;
}
