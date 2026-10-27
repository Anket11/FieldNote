import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { searchResearch } from "../services/research";
import type { ResearchResult, ReviewState, Tab } from "../types/research";

interface ResearchState {
  query: string; submittedQuery: string; status: "idle" | "loading" | "success" | "empty" | "error";
  error?: string; result: ResearchResult | null; activeTab: Tab;
  filters: { project: string; review: ReviewState | "" };
  selectedPackageIds: string[]; selectedRequirementIds: string[]; activeCitationId: string | null;
}
const initialState: ResearchState = {
  query: "", submittedQuery: "", status: "idle", result: null, activeTab: "overview",
  filters: { project: "", review: "" }, selectedPackageIds: [], selectedRequirementIds: [], activeCitationId: null,
};
export const search = createAsyncThunk("research/search", searchResearch, {
  condition: (_, { getState }) => (getState() as { research: ResearchState }).research.status !== "loading",
});
const researchSlice = createSlice({
  name: "research", initialState,
  reducers: {
    queryChanged(state, action: PayloadAction<string>) { state.query = action.payload; },
    tabChanged(state, action: PayloadAction<Tab>) { state.activeTab = action.payload; },
    filtersChanged(state, action: PayloadAction<ResearchState["filters"]>) { state.filters = action.payload; },
    packageSelectionChanged(state, action: PayloadAction<{ id: string; selected: boolean }>) {
      const { id, selected } = action.payload;
      if (!state.result?.packages.some((item) => item.id === id)) return;
      state.selectedPackageIds = selected ? [...new Set([...state.selectedPackageIds, id])] : state.selectedPackageIds.filter((value) => value !== id);
    },
    requirementToggled(state, action: PayloadAction<string>) {
      const id = action.payload;
      if (!state.result?.items.some((item) => item.id === id && item.kind === "requirement")) return;
      state.selectedRequirementIds = state.selectedRequirementIds.includes(id) ? state.selectedRequirementIds.filter((value) => value !== id) : [...state.selectedRequirementIds, id];
    },
    citationOpened(state, action: PayloadAction<string>) {
      if (state.result?.citationsById[action.payload]) state.activeCitationId = action.payload;
    },
    citationClosed(state) { state.activeCitationId = null; },
  },
  extraReducers: (builder) => builder
    .addCase(search.pending, (state) => {
      state.status = "loading"; state.error = undefined;
    })
    .addCase(search.fulfilled, (state, action) => {
      state.status = action.payload ? "success" : "empty"; state.result = action.payload; state.submittedQuery = action.meta.arg;
      state.activeCitationId = null; state.selectedPackageIds = []; state.selectedRequirementIds = [];
      state.filters = { project: "", review: "" }; state.activeTab = "overview";
    })
    .addCase(search.rejected, (state, action) => {
      state.status = "error"; state.error = action.error.message ?? "Saved research could not be loaded. Please try again.";
    }),
});
export const { queryChanged, tabChanged, filtersChanged, packageSelectionChanged, requirementToggled, citationOpened, citationClosed } = researchSlice.actions;
export default researchSlice.reducer;
const selectResult = (state: { research: ResearchState }) => state.research.result;
const selectFilters = (state: { research: ResearchState }) => state.research.filters;
export const selectFilteredPackages = createSelector([selectResult, selectFilters], (result, filters) =>
  result?.packages.filter((item) => (!filters.project || item.projectId === filters.project) && (!filters.review || item.reviewStatus === filters.review)) ?? []);
export const selectProjects = createSelector([selectResult], (result) => [...new Set(result?.packages.map((item) => item.projectId) ?? [])].sort());
export const selectSelectedPackages = createSelector([selectResult, (state: { research: ResearchState }) => state.research.selectedPackageIds], (result, ids) => result?.packages.filter((item) => ids.includes(item.id)) ?? []);
