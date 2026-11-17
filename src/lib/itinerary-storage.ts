import type { Itinerary, Stop } from '@/types/itinerary';

export const BACKUP_KIND = 'travel-map-itinerary';
export const BACKUP_VERSION = 1;

/** 写入设备或备份前，去掉 Mapbox 返回的坐标和编号。 */
export function stopForStorage(stop: Stop): Stop {
  if (stop.coordinateSource === 'mapbox' || stop.mapboxId) {
    const name = (stop.userLabel || stop.name).trim();
    return {
      id: stop.id,
      name,
      coordinateSource: 'mapbox',
    };
  }

  const stored: Stop = {
    id: stop.id,
    name: stop.name,
  };
  if (typeof stop.latitude === 'number' && typeof stop.longitude === 'number') {
    stored.latitude = stop.latitude;
    stored.longitude = stop.longitude;
  }
  if (stop.note) {
    stored.note = stop.note;
  }
  if (stop.coordinateSource) {
    stored.coordinateSource = stop.coordinateSource;
  }
  return stored;
}

export function itineraryForStorage(itinerary: Itinerary): Itinerary {
  return {
    ...itinerary,
    wishlist: itinerary.wishlist.map(stopForStorage),
    days: itinerary.days.map((day) => ({
      ...day,
      stops: day.stops.map(stopForStorage),
    })),
  };
}

export function createBackup(itinerary: Itinerary): string {
  return JSON.stringify({
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    itinerary: itineraryForStorage(itinerary),
  });
}

/** 只检查备份信封。行程内容交给 parseItinerary，避免在这里保存搜索坐标。 */
export function readBackupEnvelope(raw: string): unknown | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (record.kind !== BACKUP_KIND || record.version !== BACKUP_VERSION) {
      return null;
    }
    return record.itinerary ?? null;
  } catch {
    return null;
  }
}
