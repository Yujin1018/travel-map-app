import type { PlaceDraft, Stop } from '@/types/itinerary';

/** 同名且坐标相差约 1 米以内，视为同一个地点。 */
const SAME_COORDINATE = 0.00001;

export function hasCoordinates<T extends Pick<Stop, 'latitude' | 'longitude'>>(
  stop: T,
): stop is T & { latitude: number; longitude: number } {
  return (
    typeof stop.latitude === 'number' &&
    typeof stop.longitude === 'number' &&
    Number.isFinite(stop.latitude) &&
    Number.isFinite(stop.longitude)
  );
}

export function placeLabel(stop: Pick<Stop, 'name' | 'userLabel'>): string {
  return (stop.userLabel || stop.name).trim();
}

export function isSamePlace(
  left: Pick<Stop, 'name' | 'latitude' | 'longitude' | 'mapboxId' | 'userLabel'>,
  right: Pick<Stop, 'name' | 'latitude' | 'longitude' | 'mapboxId' | 'userLabel'>,
): boolean {
  if (left.mapboxId && right.mapboxId && left.mapboxId === right.mapboxId) {
    return true;
  }
  if (placeLabel(left).toLocaleLowerCase() !== placeLabel(right).toLocaleLowerCase()) {
    return false;
  }
  if (hasCoordinates(left) && hasCoordinates(right)) {
    return (
      Math.abs(left.latitude - right.latitude) < SAME_COORDINATE &&
      Math.abs(left.longitude - right.longitude) < SAME_COORDINATE
    );
  }
  return !hasCoordinates(left) && !hasCoordinates(right);
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
  const located = places.filter(hasCoordinates);
  if (located.length === 0) {
    return null;
  }
  const latitude = located.reduce((sum, place) => sum + place.latitude, 0) / located.length;
  const longitude = located.reduce((sum, place) => sum + place.longitude, 0) / located.length;
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
