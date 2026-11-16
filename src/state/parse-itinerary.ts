import type { DayPlan, Itinerary, SampleLeg, Stop } from '@/types/itinerary';

const MAX_STOPS = 100;
const MAX_MINUTES = 7 * 24 * 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStop(value: unknown): Stop | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    return null;
  }
  if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
    return null;
  }
  if (value.latitude < -90 || value.latitude > 90) {
    return null;
  }
  if (value.longitude < -180 || value.longitude > 180) {
    return null;
  }

  const name = value.name.trim();
  if (!name) {
    return null;
  }

  const stop: Stop = {
    id: value.id,
    name,
    latitude: value.latitude,
    longitude: value.longitude,
  };
  if (typeof value.note === 'string' && value.note.trim()) {
    stop.note = value.note.trim();
  }
  return stop;
}

function parseLeg(value: unknown): SampleLeg | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.fromStopId !== 'string' || typeof value.toStopId !== 'string') {
    return null;
  }
  if (typeof value.minutes !== 'number' || !Number.isFinite(value.minutes)) {
    return null;
  }
  if (value.minutes < 0 || value.minutes > MAX_MINUTES) {
    return null;
  }
  if (typeof value.label !== 'string' || !value.label.trim()) {
    return null;
  }

  return {
    fromStopId: value.fromStopId,
    toStopId: value.toStopId,
    minutes: Math.round(value.minutes),
    label: value.label.trim(),
  };
}

function parseDay(value: unknown): DayPlan | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.dateLabel !== 'string') {
    return null;
  }

  const title = value.title.trim();
  const dateLabel = value.dateLabel.trim();
  if (!title || !dateLabel) {
    return null;
  }

  const stops: Stop[] = [];
  if (Array.isArray(value.stops)) {
    for (const item of value.stops) {
      const stop = parseStop(item);
      if (!stop || stops.some((existing) => existing.id === stop.id)) {
        continue;
      }
      stops.push(stop);
      if (stops.length >= MAX_STOPS) {
        break;
      }
    }
  }

  const stopIds = new Set(stops.map((stop) => stop.id));
  const sampleLegs: SampleLeg[] = [];
  if (Array.isArray(value.sampleLegs)) {
    for (const item of value.sampleLegs) {
      const leg = parseLeg(item);
      if (!leg || !stopIds.has(leg.fromStopId) || !stopIds.has(leg.toStopId)) {
        continue;
      }
      sampleLegs.push(leg);
    }
  }

  return {
    id: value.id,
    title,
    dateLabel,
    stops,
    sampleLegs,
  };
}

function parseValue(value: unknown): Itinerary | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    return null;
  }
  if (!Array.isArray(value.days)) {
    return null;
  }

  const title = value.title.trim();
  if (!title) {
    return null;
  }

  const days: DayPlan[] = [];
  for (const item of value.days) {
    const day = parseDay(item);
    if (day && !days.some((existing) => existing.id === day.id)) {
      days.push(day);
    }
  }
  if (days.length === 0) {
    return null;
  }

  return { id: value.id, title, days };
}

/** 本地存档坏了就返回 null，调用方改用示例行程。 */
export function parseItinerary(raw: string): Itinerary | null {
  try {
    return parseValue(JSON.parse(raw));
  } catch {
    return null;
  }
}
