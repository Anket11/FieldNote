import type { Evidence } from "@/types/research";

export default function ReviewChecklist({ items }: { items: Evidence[] }) {
  return (
    <>
      <p role="status">{items.length} items selected for draft review.</p>
      {items.length > 0 && (
        <ul>{items.map((item) => <li key={item.id}>{item.title}: {item.text}</li>)}</ul>
      )}
    </>
  );
}
