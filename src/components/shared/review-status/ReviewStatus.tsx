import { reviewLabels } from "@/services/research";
import type { ReviewState } from "@/types/research";
export default function ReviewStatus({ status }: { status: ReviewState }) {
  return <span>{reviewLabels[status]}</span>;
}
