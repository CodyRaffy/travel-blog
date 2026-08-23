"use client";

import HelpIcon from "@/components/admin/HelpIcon";
import { STOP_CATEGORIES, StopCategoryFlags } from "@/lib/categories";

interface Props {
  value: StopCategoryFlags;
  onChange: (next: StopCategoryFlags) => void;
  compact?: boolean;
}

/** Checkbox row for all stop categories, with help tips. */
export default function CategoryPicker({ value, onChange, compact = false }: Props) {
  return (
    <>
      {STOP_CATEGORIES.map((c) => (
        <label key={c.key} style={{ marginRight: compact ? "12px" : "16px", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={value[c.key]} onChange={(e) => onChange({ ...value, [c.key]: e.target.checked })} />{" "}
          {c.label}
          {c.help && <HelpIcon text={c.help} />}
        </label>
      ))}
    </>
  );
}
