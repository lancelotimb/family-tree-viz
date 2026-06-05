"use client";

import { Pause, Play, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLAYBACK_DURATION_MS = 5000;

type TimePlayerProps = {
  minYear: number;
  maxYear: number;
  year: number;
  onYearChange: (year: number) => void;
  onClose?: () => void;
  onScrubbingChange?: (scrubbing: boolean) => void;
  className?: string;
};

const iconButtonClassName =
  "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#e8dfd0] bg-[#faf6ef] text-[#3d3428] transition-colors hover:border-[#d4c4a8] hover:bg-white";

function clampYear(year: number, minYear: number, maxYear: number) {
  return Math.min(maxYear, Math.max(minYear, year));
}

export function TimePlayer({
  minYear,
  maxYear,
  year,
  onYearChange,
  onClose,
  onScrubbingChange,
  className = "",
}: TimePlayerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const yearRef = useRef(year);
  const pausedMidPlaybackRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  yearRef.current = year;

  const yearOptions = useMemo(() => {
    const options: number[] = [];
    for (let y = minYear; y <= maxYear; y++) {
      options.push(y);
    }
    return options;
  }, [minYear, maxYear]);

  const yearStepMs = useMemo(() => {
    const yearCount = Math.max(1, maxYear - minYear + 1);
    return PLAYBACK_DURATION_MS / yearCount;
  }, [minYear, maxYear]);

  const pausePlayback = useCallback((rememberPosition = false) => {
    if (rememberPosition && playing) {
      pausedMidPlaybackRef.current = true;
    } else {
      pausedMidPlaybackRef.current = false;
    }
    setPlaying(false);
  }, [playing]);

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

  const endDrag = useCallback(
    (pointerId?: number) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      activePointerIdRef.current = null;
      const track = trackRef.current;
      if (track && pointerId !== undefined && track.hasPointerCapture(pointerId)) {
        track.releasePointerCapture(pointerId);
      }
      onScrubbingChange?.(false);
    },
    [onScrubbingChange],
  );

  const beginScrub = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      pausePlayback(false);
      const track = trackRef.current;
      if (!track) return;
      track.setPointerCapture(event.pointerId);
      draggingRef.current = true;
      activePointerIdRef.current = event.pointerId;
      onScrubbingChange?.(true);
      updateFromClientX(event.clientX);
    },
    [onScrubbingChange, pausePlayback, updateFromClientX],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current || activePointerIdRef.current !== event.pointerId) return;
      event.preventDefault();
      updateFromClientX(event.clientX);
    },
    [updateFromClientX],
  );

  const handlePointerEnd = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (activePointerIdRef.current !== event.pointerId) return;
      endDrag(event.pointerId);
    },
    [endDrag],
  );

  const handlePlayPause = useCallback(() => {
    if (playing) {
      pausePlayback(true);
      return;
    }
    if (!pausedMidPlaybackRef.current || yearRef.current >= maxYear) {
      onYearChange(minYear);
    }
    pausedMidPlaybackRef.current = false;
    setPlaying(true);
  }, [maxYear, minYear, onYearChange, pausePlayback, playing]);

  useEffect(() => {
    if (!playing) return;

    const intervalId = window.setInterval(() => {
      const current = yearRef.current;
      if (current >= maxYear) {
        pausedMidPlaybackRef.current = false;
        setPlaying(false);
        return;
      }
      onYearChange(current + 1);
    }, yearStepMs);

    return () => window.clearInterval(intervalId);
  }, [playing, maxYear, onYearChange, yearStepMs]);

  useEffect(() => {
    return () => setPlaying(false);
  }, []);

  const thumbPercent = yearToPercent(year);

  return (
    <div
      className={`pointer-events-auto flex h-10 min-w-0 items-center gap-2 overflow-visible rounded-xl border border-[#e8dfd0] bg-white/80 px-2 shadow-lg backdrop-blur-md ${className}`}
    >
      <label className="flex h-full shrink-0 items-center">
        <span className="sr-only">Year</span>
        <select
          value={year}
          onChange={(event) => {
            pausePlayback(false);
            onYearChange(Number(event.target.value));
          }}
          className="h-7 cursor-pointer rounded-lg border border-[#e8dfd0] bg-[#faf6ef] px-2 text-sm font-medium text-[#3d3428] tabular-nums outline-none focus:border-[#d4c4a8]"
          aria-label="Selected year"
        >
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}
            </option>
          ))}
        </select>
      </label>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="hidden shrink-0 text-xs text-[#8b7d6b] sm:inline">
          {minYear}
        </span>
        <div
          ref={trackRef}
          className="relative h-full min-w-0 flex-1 touch-none px-2"
          onPointerDown={beginScrub}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          <div
            className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 cursor-pointer rounded-full bg-[#e8dfd0]"
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
          </div>
          <button
            type="button"
            className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
            style={{ left: `${thumbPercent}%` }}
            onPointerDown={beginScrub}
            aria-hidden
            tabIndex={-1}
          >
            <span className="h-4 w-4 rounded-full border-2 border-white bg-[#7a9e6a] shadow" />
          </button>
        </div>
        <span className="hidden shrink-0 text-xs text-[#8b7d6b] sm:inline">
          {maxYear}
        </span>
      </div>

      <button
        type="button"
        onClick={handlePlayPause}
        aria-label={playing ? "Pause playback" : "Play through years"}
        title={playing ? "Pause" : "Play"}
        className={iconButtonClassName}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close time travel"
          title="Close"
          className={`${iconButtonClassName} md:hidden`}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
