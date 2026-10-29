import { formatSourceText, isStructuredSource } from "@/services/sourceText";
import styles from "./SourceLinks.module.css";
import type { Citation } from "@/types/research";
import SourceCitation from "../../agent/sources/SourceCitation";

export default function SourceLinks({ groups }: { groups: Citation[][] }) {
  if (!groups.length) return null;
  return <span className={styles.root}>{groups.map((passages) => {
      const first = passages[0];
      return <SourceCitation key={first.id} source={{
        id: first.id, title: passages.length > 1 ? first.sourceFile ?? first.title : first.title,
        text: passages.length === 1 ? first.text : passages.map((source) => `${source.title}\n\n${formatSourceText(source.text)}`).join("\n\n"),
        excerpts: [...new Set(passages.flatMap((source) => isStructuredSource(source.text) ? [] : source.mentions))],
        context: [...new Set(passages.map((source) => `${source.projectTitle} (${source.projectId})`))].join(" · "),
        fileName: first.sourceFile, url: passages.find((source) => source.sourceUrl)?.sourceUrl,
      }} />;
    })}</span>;
}
