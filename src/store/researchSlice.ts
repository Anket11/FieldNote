import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ResearchResult } from "../types/research";

const researchSlice = createSlice({
  name: "research",
  initialState: { result: null as ResearchResult | null },
  reducers: {
    libraryLoaded(state, action: PayloadAction<ResearchResult>) { state.result = action.payload; },
  },
});
export const { libraryLoaded } = researchSlice.actions;
export default researchSlice.reducer;
