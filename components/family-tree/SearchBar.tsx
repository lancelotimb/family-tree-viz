"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { Search } from "lucide-react";
import { ProfileAvatar } from "./ProfileAvatar";
import { searchIndex } from "./familyGraph";

type SearchBarProps = {
  onOpenChange?: (open: boolean) => void;
  visibleFamilyNames?: Set<string>;
};

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `${birth} –`;
}

export function SearchBar({ onOpenChange, visibleFamilyNames }: SearchBarProps) {
  const { fitView, getNode } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visiblePeople = searchIndex.filter(
      (item) => !visibleFamilyNames || visibleFamilyNames.has(item.familyName),
    );
    if (!q) return visiblePeople.slice(0, 6);
    return visiblePeople
      .filter((item) => item.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, visibleFamilyNames]);

  const setDropdownOpen = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const focusNode = useCallback(
    (id: string) => {
      const node = getNode(id);
      if (!node) return;
      fitView({
        nodes: [{ id }],
        duration: 500,
        padding: 0.4,
        maxZoom: 1.2,
      });
      setDropdownOpen(false);
      setQuery("");
    },
    [fitView, getNode, setDropdownOpen],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setDropdownOpen]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as globalThis.Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [setDropdownOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== "ArrowDown") return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      focusNode(results[activeIndex].id);
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="pointer-events-auto relative w-full max-w-md">
      <div
        className={`flex items-center gap-2 rounded-full border bg-white/80 px-4 py-2.5 shadow-lg backdrop-blur-md transition-all duration-300 ${
          open ? "border-[#c9b896] ring-2 ring-[#d4b896]/30" : "border-[#e8dfd0]"
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-[#a8957a]" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search ancestors…"
          className="min-w-0 flex-1 bg-transparent text-sm text-[#3d3428] outline-none placeholder:text-[#a8957a]/70"
          aria-label="Search ancestors"
          aria-expanded={open}
          aria-controls="search-results"
          role="combobox"
        />
        <kbd className="hidden shrink-0 rounded border border-[#e8dfd0] bg-[#faf6ef] px-1.5 py-0.5 text-[10px] font-medium text-[#8b7d6b] sm:inline">
          ⌘K
        </kbd>
      </div>

      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-[#e8dfd0] bg-white/95 py-1 shadow-xl backdrop-blur-md"
        >
          {results.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => focusNode(item.id)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  index === activeIndex ? "bg-[#f5efe4]" : "hover:bg-[#faf6ef]"
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e8dfd0] bg-[#faf6ef]">
                  <ProfileAvatar gender={item.gender} className="h-5 w-5 text-[#a8957a]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#3d3428]">{item.name}</p>
                  <p className="text-xs text-[#8b7d6b]">
                    {formatLifespan(item.birthYear, item.deathYear)}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
