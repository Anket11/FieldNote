import { ArrowRight, Square, Search, FileText, LibraryBig, ChevronDown, CornerDownRight,
  Download, Copy, X, Check, Sparkles, Plus, ArrowUpRight, LoaderCircle, PanelLeft,
  House, MapPinned, Mountain, History, LocateFixed } from "lucide-react";

const icons = { send: ArrowRight, stop: Square, search: Search, document: FileText, sources: LibraryBig,
  chevron: ChevronDown, followUp: CornerDownRight, download: Download, copy: Copy, close: X,
  check: Check, sparkle: Sparkles, plus: Plus, external: ArrowUpRight, spinner: LoaderCircle,
  sidebar: PanelLeft, home: House, map: MapPinned, terrain: Mountain, history: History, target: LocateFixed };

export default function ChatIcon({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" focusable="false" size={20} strokeWidth={1.75} />;
}
