"use client";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { libraryLoaded } from "./researchSlice";
import type { ResearchResult } from "@/types/research";
import { makeStore } from "./store";
export default function ResearchProvider({ children, result }: { children: ReactNode; result: ResearchResult }) {
  const [store] = useState(() => {
    const store = makeStore();
    store.dispatch(libraryLoaded(result));
    return store;
  });
  return <Provider store={store}>{children}</Provider>;
}
