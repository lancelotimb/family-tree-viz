"use client";

import { searchIndex } from "./familyGraph";

type PersonSelectProps = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  visibleFamilyNames?: Set<string>;
};

export function PersonSelect({
  label,
  value,
  onChange,
  excludeId,
  visibleFamilyNames,
}: PersonSelectProps) {
  const options = searchIndex
    .filter(
      (p) =>
        p.id !== excludeId &&
        (!visibleFamilyNames || visibleFamilyNames.has(p.familyName)),
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer rounded-lg border border-[#e8dfd0] bg-[#fffef9] px-2.5 py-2 text-sm text-[#3d3428] outline-none transition-colors hover:border-[#d4c4a8] focus:border-[#c9b896] focus:ring-2 focus:ring-[#d4b896]/30"
        aria-label={label}
      >
        <option value="">Select a person…</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
