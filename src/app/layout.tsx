import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = { title: "Research Workspace", description: "Connect procurement records, operational context, and lessons learned. Research with sources, capture findings, and plan next steps in one workspace." };
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
