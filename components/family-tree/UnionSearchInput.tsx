"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import { individuals, unionSearchIndex } from "./familyGraph";

type UnionSearchInputProps = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  visibleFamilyNames?: Set<string>;
  placeholder?: string;
};

function formatUnionMeta(
  marriageYear: number | null,
  divorced: boolean,
  childCount: number,
) {
  const parts: string[] = [];
  if (marriageYear) {
    parts.push(divorced ? `Married ${marriageYear}, divorced` : `Married ${marriageYear}`);
  } else if (divorced) {
    parts.push("Divorced");
  }
  parts.push(childCount === 1 ? "1 child" : `${childCount} children`);
  return parts.join(" · ");
}

export function UnionSearchInput({
  label,
  value,
  onChange,
  visibleFamilyNames,
  placeholder = "Search a union…",
}: UnionSearchInputProps) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedUnion = useMemo(
    () => unionSearchIndex.find((union) => union.id === value),
    [value],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleUnions = unionSearchIndex.filter((union) => {
      if (!visibleFamilyNames) return true;
      return union.partnerIds.some((partnerId) =>
        visibleFamilyNames.has(individuals[partnerId]?.familyName ?? ""),
      );
    });
    if (!q) return visibleUnions.slice(0, 6);
    return visibleUnions
      .filter((union) => union.label.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, visibleFamilyNames]);

  const selectUnion = useCallback(
    (id: string) => {
      onChange(id);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const clearSelection = useCallback(() => {
    onChange("");
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as globalThis.Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== "ArrowDown") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      selectUnion(results[activeIndex].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const inputValue = open ? query : (selectedUnion?.label ?? query);

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
        {label}
      </span>
      <div
        className={`flex items-center gap-2 rounded-xl border bg-[#fffef9] px-3 py-2 shadow-sm transition-all ${
          open ? "border-[#c9b896] ring-2 ring-[#d4b896]/30" : "border-[#e8dfd0]"
        }`}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-[#a8957a]" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => {
            setOpen(true);
            if (selectedUnion) {
              setQuery("");
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-sm text-[#3d3428] outline-none placeholder:text-[#a8957a]/70"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          role="combobox"
        />
        {value ? (
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 rounded-full p-0.5 text-[#a8957a] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label={`Clear ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {open && results.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-52 overflow-y-auto rounded-xl border border-[#e8dfd0] bg-white/95 py-1 shadow-xl backdrop-blur-md"
        >
          {results.map((union, index) => (
            <li key={union.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectUnion(union.id)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  index === activeIndex ? "bg-[#f5efe4]" : "hover:bg-[#faf6ef]"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef]">
                  <Heart className="h-4 w-4 text-[#a8957a]" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#3d3428]">{union.label}</p>
                  <p className="text-xs text-[#8b7d6b]">
                    {formatUnionMeta(union.marriageYear, union.divorced, union.childCount)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
