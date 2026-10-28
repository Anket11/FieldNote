import { configureStore } from "@reduxjs/toolkit";
import research from "./researchSlice";
export const makeStore = () => configureStore({ reducer: { research } });
type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
