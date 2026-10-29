import { useState, type ReactNode } from "react";
import { WorkspaceContext } from "../../src/components/app/WorkspaceContext";
import { createWorkspace, type Workspace } from "../../src/services/workspaces";
export function WorkspaceHarness({ children, initial = createWorkspace("Audit") }: { children: ReactNode; initial?: Workspace }) {
  const [workspace, update] = useState(initial);
  return <WorkspaceContext.Provider value={{ workspace, update }}>{children}<output data-testid="workspace-data">{JSON.stringify(workspace)}</output></WorkspaceContext.Provider>;
}
