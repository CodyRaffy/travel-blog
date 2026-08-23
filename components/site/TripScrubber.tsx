"use client";

import { useEffect, useRef, useState } from "react";
import { StopInfoResponse } from "@/models/StopInfo";
import { fmtNights, fmtMonthRange, fmtDay } from "@/lib/format";

interface TripScrubberProps {
  stops: StopInfoResponse[];
  /** Continuous position: whole numbers are stops, fractions are along the leg to the next stop. */
  position: number;
  onChange: (position: number) => void;
  /** Road miles driven up to `position`, and for the whole (filtered) trip. */
  miles: number;
  totalMiles: number;
}

export default function TripScrubber({ stops, position, onChange, miles, totalMiles }: TripScrubberProps) {
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);
  const posRef = useRef(position);
  posRef.current = position;

  const max = Math.max(0, stops.length - 1);
  const idx = Math.floor(position);
  const frac = position - idx;
  const at = stops[idx];
  const next = stops[idx + 1];
  const enRoute = frac > 0.02 && next;

  useEffect(() => {
    if (!playing) return;
    const SPEED = 0.6; // stops per second
    const tick = (t: number) => {
      if (last.current) {
        const p = posRef.current + ((t - last.current) / 1000) * SPEED;
        if (p >= max) {
          onChange(max);
          setPlaying(false);
          return;
        }
        onChange(p);
      }
      last.current = t;
      raf.current = requestAnimationFrame(tick);
    };
    last.current = 0;
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [playing, max, onChange]);

  if (stops.length === 0) return null;

  return (
    <div className="trip-scrubber" aria-label="Trip timeline">
      <div className="row">
        <button
          className="play"
          onClick={() => {
            if (!playing && position >= max) onChange(0);
            setPlaying((p) => !p);
          }}
          aria-label={playing ? "Pause" : "Drive the trip"}
          title={playing ? "Pause" : "Drive the trip"}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <input
          type="range"
          min={0}
          max={max}
          step={0.01}
          value={position}
          onChange={(e) => {
            setPlaying(false);
            onChange(Number(e.target.value));
          }}
          aria-valuetext={at ? at.name : ""}
        />
        <span className="count">
          {idx + 1} / {stops.length}
        </span>
      </div>
      <div className="odometer" title={`${Math.round(totalMiles).toLocaleString()} road miles in total`}>
        <span className="digits">{Math.round(miles).toLocaleString("en-US").padStart(6, "0")}</span>
        <span className="unit">mi</span>
      </div>
      <div className="readout">
        {enRoute ? (
          <>
            <div className="line">
              <span className="eyebrow-inline">On the road</span>
              <strong>
                {at.name} → {next!.name}
              </strong>
            </div>
            <div className="dates">{fmtDay(at.departureDate, { month: "long", year: "numeric" })}</div>
          </>
        ) : at ? (
          <>
            <div className="line">
              <span className="eyebrow-inline">{at.homeBase ? "Home base" : at.overnightStop ? "Overnight stop" : "Stop"}</span>
              <a href={`/stops/${at.slug}`}>
                <strong>{at.name}</strong>
              </a>
            </div>
            <div className="dates">
              {fmtMonthRange(at.arrivalDate, at.departureDate)} · {fmtNights(at.arrivalDate, at.departureDate)}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
