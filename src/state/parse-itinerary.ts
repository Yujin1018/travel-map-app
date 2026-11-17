import type { CoordinateSource, DayPlan, Itinerary, SampleLeg, Stop } from '@/types/itinerary';

const MAX_STOPS = 100;
const MAX_DAYS = 31;
const MAX_MINUTES = 7 * 24 * 60;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSource(value: unknown): CoordinateSource | undefined {
  if (value === 'sample' || value === 'manual' || value === 'mapbox') {
    return value;
  }
  return undefined;
}

function coordinatesOf(value: Record<string, unknown>): { latitude: number; longitude: number } | null {
  if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') {
    return null;
  }
  if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) {
    return null;
  }
  if (value.latitude < -90 || value.latitude > 90 || value.longitude < -180 || value.longitude > 180) {
    return null;
  }
  return { latitude: value.latitude, longitude: value.longitude };
}

function parseStop(value: unknown): Stop | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }
  const name = value.name.trim();
  if (!name) {
    return null;
  }

  const source = readSource(value.coordinateSource);
  const fromSearch = source === 'mapbox' || (typeof value.mapboxId === 'string' && value.mapboxId.trim().length > 0);
  if (fromSearch) {
    return { id: value.id, name, coordinateSource: 'mapbox' };
  }

  const coordinates = coordinatesOf(value);
  if (!coordinates) {
    return null;
  }
  const stop: Stop = {
    id: value.id,
    name,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
  if (source) {
    stop.coordinateSource = source;
  }
  if (typeof value.note === 'string' && value.note.trim()) {
    stop.note = value.note.trim();
  }
  return stop;
}

function parseStopList(value: unknown, usedIds: Set<string>): Stop[] {
  const stops: Stop[] = [];
  if (!Array.isArray(value)) {
    return stops;
  }
  for (const item of value) {
    const stop = parseStop(item);
    if (!stop || usedIds.has(stop.id)) {
      continue;
    }
    usedIds.add(stop.id);
    stops.push(stop);
    if (stops.length >= MAX_STOPS) {
      break;
    }
  }
  return stops;
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

function parseDay(value: unknown, usedIds: Set<string>): DayPlan | null {
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

  const stops = parseStopList(value.stops, usedIds);
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

  const usedIds = new Set<string>();
  const days: DayPlan[] = [];
  for (const item of value.days) {
    const day = parseDay(item, usedIds);
    if (day && !days.some((existing) => existing.id === day.id)) {
      days.push(day);
    }
    if (days.length >= MAX_DAYS) {
      break;
    }
  }
  const firstDay = days[0];
  if (!firstDay) {
    return null;
  }

  const wishlist = parseStopList(value.wishlist, usedIds);
  const requestedActiveDayId = typeof value.activeDayId === 'string' ? value.activeDayId : '';
  const activeDayId = days.some((day) => day.id === requestedActiveDayId) ? requestedActiveDayId : firstDay.id;

  return { id: value.id, title, days, wishlist, activeDayId };
}

/** 本地存档坏了就返回 null，调用方改用示例行程。 */
export function parseItinerary(raw: string): Itinerary | null {
  try {
    return parseValue(JSON.parse(raw));
  } catch {
    return null;
  }
}
