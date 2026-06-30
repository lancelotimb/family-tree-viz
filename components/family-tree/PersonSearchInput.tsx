"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { searchIndex } from "./familyGraph";
import { isBornByYear } from "./timeUtils";
import { useGraphRevision } from "./useGraphRevision";

type PersonSearchInputProps = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  excludeId?: string;
  excludeIds?: Iterable<string>;
  visibleFamilyNames?: Set<string>;
  lineagePersonIds?: Set<string> | null;
  aliveAtYear?: number | null;
  placeholder?: string;
};

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `${birth} –`;
}

export function PersonSearchInput({
  label,
  value,
  onChange,
  excludeId,
  excludeIds,
  visibleFamilyNames,
  lineagePersonIds,
  aliveAtYear = null,
  placeholder = "Rechercher des ancêtres...",
}: PersonSearchInputProps) {
  const graphRevision = useGraphRevision();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const excluded = useMemo(() => {
    const ids = new Set<string>();
    if (excludeId) ids.add(excludeId);
    if (excludeIds) {
      for (const id of excludeIds) ids.add(id);
    }
    return ids;
  }, [excludeId, excludeIds]);

  const selectedPerson = useMemo(
    () => searchIndex.find((person) => person.id === value),
    [value, graphRevision],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visiblePeople = searchIndex.filter(
      (person) =>
        !excluded.has(person.id) &&
        (!visibleFamilyNames || visibleFamilyNames.has(person.familyName)) &&
        (!lineagePersonIds || lineagePersonIds.has(person.id)) &&
        (aliveAtYear === null || isBornByYear(person.birthYear, aliveAtYear)),
    );
    if (!q) return visiblePeople.slice(0, 6);
    return visiblePeople
      .filter((person) => person.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, excluded, visibleFamilyNames, lineagePersonIds, aliveAtYear, graphRevision]);

  const selectPerson = useCallback(
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
      selectPerson(results[activeIndex].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  const inputValue = open ? query : (selectedPerson?.name ?? query);

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
            if (selectedPerson) {
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
            className="shrink-0 cursor-pointer rounded-full p-0.5 text-[#a8957a] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            aria-label={`Effacer ${label}`}
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
          {results.map((person, index) => (
            <li key={person.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectPerson(person.id)}
                className={`flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  index === activeIndex ? "bg-[#f5efe4]" : "hover:bg-[#faf6ef]"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef]">
                  <ProfileAvatar gender={person.gender} className="h-4 w-4 text-[#a8957a]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#3d3428]">{person.name}</p>
                  <p className="text-xs text-[#8b7d6b]">
                    {formatLifespan(person.birthYear, person.deathYear)}
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
