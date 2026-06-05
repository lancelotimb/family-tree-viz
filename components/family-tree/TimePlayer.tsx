"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TimePlayerProps = {
  minYear: number;
  maxYear: number;
  year: number;
  onYearChange: (year: number) => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
};

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(maxYear, Math.max(minYear, year));
}

export function TimePlayer({
  minYear,
  maxYear,
  year,
  onYearChange,
  onScrubbingChange,
}: TimePlayerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [inputValue, setInputValue] = useState(String(year));

  useEffect(() => {
    setInputValue(String(year));
  }, [year]);

  const yearToPercent = useCallback(
    (value: number) => {
      if (maxYear === minYear) return 0;
      return ((value - minYear) / (maxYear - minYear)) * 100;
    },
    [minYear, maxYear],
  );

  const percentToYear = useCallback(
    (percent: number) => {
      if (maxYear === minYear) return minYear;
      const raw = minYear + (percent / 100) * (maxYear - minYear);
      return clampYear(Math.round(raw), minYear, maxYear);
    },
    [minYear, maxYear],
  );

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const percent = ((clientX - rect.left) / rect.width) * 100;
      onYearChange(percentToYear(percent));
    },
    [onYearChange, percentToYear],
  );

  const startDrag = useCallback(() => {
    draggingRef.current = true;
    onScrubbingChange?.(true);
  }, [onScrubbingChange]);

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onScrubbingChange?.(false);
  }, [onScrubbingChange]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      updateFromClientX(event.clientX);
    };
    const onPointerUp = () => endDrag();

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [endDrag, updateFromClientX]);

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    startDrag();
    updateFromClientX(event.clientX);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const commitInput = () => {
    const parsed = Number.parseInt(inputValue, 10);
    if (Number.isNaN(parsed)) {
      setInputValue(String(year));
      return;
    }
    onYearChange(clampYear(parsed, minYear, maxYear));
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitInput();
      event.currentTarget.blur();
    }
  };

  const thumbPercent = yearToPercent(year);

  return (
    <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#e8dfd0] bg-white/80 px-3 py-2 shadow-lg backdrop-blur-md">
      <label className="flex shrink-0 items-center gap-1.5">
        <span className="sr-only">Year</span>
        <input
          type="number"
          min={minYear}
          max={maxYear}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={commitInput}
          onKeyDown={handleInputKeyDown}
          className="w-[4.5rem] rounded-lg border border-[#e8dfd0] bg-[#faf6ef] px-2 py-1 text-center text-sm font-medium text-[#3d3428] tabular-nums outline-none focus:border-[#d4c4a8]"
          aria-label="Selected year"
        />
      </label>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden shrink-0 text-xs text-[#8b7d6b] sm:inline">
          {minYear}
        </span>
        <div
          ref={trackRef}
          className="relative h-2 min-w-0 flex-1 cursor-pointer rounded-full bg-[#e8dfd0]"
          onPointerDown={handleTrackPointerDown}
          role="slider"
          aria-label="Timeline"
          aria-valuemin={minYear}
          aria-valuemax={maxYear}
          aria-valuenow={year}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#c4b49a]"
            style={{ width: `${thumbPercent}%` }}
          />
          <button
            type="button"
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-[#7a9e6a] shadow active:cursor-grabbing"
            style={{ left: `${thumbPercent}%` }}
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              startDrag();
            }}
            aria-hidden
            tabIndex={-1}
          />
        </div>
        <span className="hidden shrink-0 text-xs text-[#8b7d6b] sm:inline">
          {maxYear}
        </span>
      </div>
    </div>
  );
}
