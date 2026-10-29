import styles from "./RecordDetails.module.css";
import type { Citation, Evidence } from "@/types/research";
import type { DetailKey } from "@/types/chat";
import { awardFields, packageLocationText } from "@/services/packageComparison";
import SourceLinks from "../evidence/SourceLinks";
import { firstSourceMentions } from "@/services/answerSources";
import Details from "../../agent/Details";

const defaultFields: DetailKey[] = ["text", "location", "supplier", "awardValue", "duration", "relevance", "differences", "unknowns"];
const labels = { text: "Scope", location: "Location", supplier: "Supplier", awardValue: "Award value", duration: "Stated contract duration", relevance: "Why it’s relevant", differences: "Reported differences", unknowns: "Unknowns to resolve" };
export default function RecordDetails({ item, award, fields = defaultFields, sourceGroups = [] }: { item: Evidence; award?: Evidence; fields?: DetailKey[]; sourceGroups?: Citation[][] }) {
  const commercial = awardFields(award);
  const values = { text: item.text, location: packageLocationText(item), supplier: commercial.supplier, awardValue: commercial.value,
    duration: commercial.duration, relevance: item.relevance, differences: item.differences, unknowns: item.unknowns };
  const citations = firstSourceMentions(sourceGroups, fields.map((field) => {
    const value = values[field];
    if (!value || (Array.isArray(value) && !value.length)) return [];
    return ["supplier", "awardValue", "duration"].includes(field) ? award?.citationIds ?? [] : item.citationIds;
  }));
  return <div className={styles.root}>
    <h4>{item.title}</h4>
    {item.id === award?.id && <p>Historical award · package link not established</p>}

    <Details fields={fields.map((field, index) => ({
      label: labels[field], value: values[field], suffix: <> <SourceLinks groups={citations[index]} /></>,
    }))} />
  </div>;
}
