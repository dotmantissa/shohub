import type { Category } from "@/lib/queries";

const colors: Record<Category, string> = {
  AI: "category-chip--ai",
  DePIN: "category-chip--depin",
  Gaming: "category-chip--gaming",
  Infrastructure: "category-chip--infrastructure",
  Storage: "category-chip--storage",
  Other: "category-chip--other",
};

export function CategoryChip({ category }: { category: Category }) {
  return <span className={`category-chip ${colors[category]}`}>{category}</span>;
}
