import type { PlaceDraft, Stop } from '@/types/itinerary';

/** 同名且坐标相差约 1 米以内，视为同一个地点。 */
const SAME_COORDINATE = 0.00001;

export function isSamePlace(
  left: Pick<Stop, 'name' | 'latitude' | 'longitude' | 'mapboxId'>,
  right: Pick<Stop, 'name' | 'latitude' | 'longitude' | 'mapboxId'>,
): boolean {
  if (left.mapboxId && right.mapboxId && left.mapboxId === right.mapboxId) {
    return true;
  }
  return (
    left.name.trim().toLocaleLowerCase() === right.name.trim().toLocaleLowerCase() &&
    Math.abs(left.latitude - right.latitude) < SAME_COORDINATE &&
    Math.abs(left.longitude - right.longitude) < SAME_COORDINATE
  );
}

export function uniquePlaces(places: Stop[]): Stop[] {
  const unique: Stop[] = [];
  for (const place of places) {
    if (unique.some((existing) => existing.id === place.id || isSamePlace(existing, place))) {
      continue;
    }
    unique.push(place);
  }
  return unique;
}

export function averageCoordinate(
  places: Pick<Stop, 'latitude' | 'longitude'>[],
): { latitude: number; longitude: number } | null {
  if (places.length === 0) {
    return null;
  }
  const latitude = places.reduce((sum, place) => sum + place.latitude, 0) / places.length;
  const longitude = places.reduce((sum, place) => sum + place.longitude, 0) / places.length;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

export function draftIsValid(draft: PlaceDraft): boolean {
  const name = draft.name.trim();
  if (!name || name.length > 80) {
    return false;
  }
  if (!Number.isFinite(draft.latitude) || !Number.isFinite(draft.longitude)) {
    return false;
  }
  if (draft.latitude < -90 || draft.latitude > 90) {
    return false;
  }
  if (draft.longitude < -180 || draft.longitude > 180) {
    return false;
  }
  return true;
}
