import type { Metadata } from "next";
import type { ReactNode } from "react";
import ResearchProvider from "@/store/Provider";
import "./globals.css";
export const metadata: Metadata = { title: "Procurement research demo", description: "Saved procurement evidence for a 132 kV substation and connecting line scenario." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><ResearchProvider>{children}</ResearchProvider></body></html>;
}
