import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { searchResearch } from "../services/research";
import type { ResearchResult } from "../types/research";

interface ResearchState {
  query: string;
  submittedQuery: string;
  status: "idle" | "loading" | "success" | "empty" | "error";
  error?: string;
  result: ResearchResult | null;
  activeTab: string;
  projectFilter: string;
  selectedIds: string[];
  activeCitationId: string | null;
  evidenceItemId: string | null;
  evidenceOpenerId: string;
}
const initialState: ResearchState = {
  query: "", submittedQuery: "", status: "idle", result: null, activeTab: "research",
  projectFilter: "", selectedIds: [], activeCitationId: null, evidenceItemId: null, evidenceOpenerId: "",
};
export const search = createAsyncThunk("research/search", searchResearch, {
  condition: (_, { getState }) => (getState() as { research: ResearchState }).research.status !== "loading",
});
const researchSlice = createSlice({
  name: "research", initialState,
  reducers: {
    queryChanged(state, action: PayloadAction<string>) { state.query = action.payload; },
    tabChanged(state, action: PayloadAction<string>) {
      if (["research", "prepare", "review"].includes(action.payload)) state.activeTab = action.payload;
    },
    projectFilterChanged(state, action: PayloadAction<string>) { state.projectFilter = action.payload; },
    reviewSelectionChanged(state, action: PayloadAction<{ id: string; selected: boolean }>) {
      const { id, selected } = action.payload;
      const valid = state.result?.sections.some((section) => section.items.some((item) => item.id === id &&
        (["tender_requirements", "readiness_checklist"].includes(section.id) || (section.id === "similar_procurements" && item.kind === "package"))));
      if (!valid) return;
      state.selectedIds = selected ? [...new Set([...state.selectedIds, id])] : state.selectedIds.filter((value) => value !== id);
    },
    evidenceOpened(state, action: PayloadAction<{ itemId: string; openerId: string }>) {
      const item = state.result?.sections.flatMap((section) => section.items).find((item) => item.id === action.payload.itemId);
      const firstCitation = item?.citationIds.find((id) => state.result && Object.hasOwn(state.result.citationsById, id));
      if (!firstCitation) return;
      state.evidenceItemId = action.payload.itemId;
      state.evidenceOpenerId = action.payload.openerId;
      state.activeCitationId = firstCitation;
    },
    citationOpened(state, action: PayloadAction<string>) {
      const item = state.result?.sections.flatMap((section) => section.items).find((item) => item.id === state.evidenceItemId);
      if (item?.citationIds.includes(action.payload) && state.result && Object.hasOwn(state.result.citationsById, action.payload)) {
        state.activeCitationId = action.payload;
      }
    },
    citationClosed(state) { state.activeCitationId = null; state.evidenceItemId = null; },
  },
  extraReducers: (builder) => builder
    .addCase(search.pending, (state) => { state.status = "loading"; state.error = undefined; })
    .addCase(search.fulfilled, (state, action) => {
      state.status = action.payload ? "success" : "empty"; state.result = action.payload; state.submittedQuery = action.meta.arg;
      state.activeCitationId = null; state.evidenceItemId = null; state.evidenceOpenerId = ""; state.selectedIds = [];
      state.projectFilter = ""; state.activeTab = "research";
    })
    .addCase(search.rejected, (state, action) => {
      state.status = "error"; state.error = action.error.message ?? "Research could not be loaded. Please try again.";
    }),
});
export const { queryChanged, tabChanged, projectFilterChanged, reviewSelectionChanged, evidenceOpened, citationOpened, citationClosed } = researchSlice.actions;
export default researchSlice.reducer;
const selectResult = (state: { research: ResearchState }) => state.research.result;
export const selectPackageItems = createSelector([selectResult], (result) =>
  result?.sections.find((section) => section.id === "similar_procurements")?.items.filter((item) => item.kind === "package") ?? []);
export const selectFilteredPackages = createSelector([selectPackageItems, (state: { research: ResearchState }) => state.research.projectFilter], (items, project) =>
  items.filter((item) => !project || item.projectIds.includes(project)));
export const selectPackageProjects = createSelector([selectResult, selectPackageItems], (result, items) =>
  result?.projects.filter((project) => items.some((item) => item.projectIds.includes(project.id))) ?? []);
export const selectEvidenceItem = createSelector([selectResult, (state: { research: ResearchState }) => state.research.evidenceItemId], (result, id) =>
  result?.sections.flatMap((section) => section.items).find((item) => item.id === id));
export const selectEvidenceCitations = createSelector([selectResult, selectEvidenceItem], (result, item) =>
  item?.citationIds.flatMap((id) => result && Object.hasOwn(result.citationsById, id) ? [result.citationsById[id]] : []) ?? []);
