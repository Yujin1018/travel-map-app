import type { Stop } from '@/types/itinerary';

type LocatedStop = Stop & { latitude: number; longitude: number };

const EARTH_KM = 6371;

/**
 * 按经纬度把地点分成若干天。
 * 先挑彼此离得远的种子，再把每个地点分给最近、而且这一天还没满的种子。
 * 一天内部用就近顺序，不是道路导航。
 */
export function planDays(places: LocatedStop[], requestedDays: number): LocatedStop[][] {
  if (places.length === 0) {
    return [];
  }

  const dayCount = clampDays(requestedDays);
  const source = places.slice();
  if (dayCount === 1 || source.length === 1) {
    return padDays([orderStops(source, null, null)], dayCount);
  }

  const seedCount = Math.min(dayCount, source.length);
  const seedIndexes = pickSeeds(source, seedCount);
  const groups = seedIndexes.map((index) => {
    const seed = source[index];
    return seed ? [seed] : [];
  });
  const seeds = seedIndexes
    .map((index) => source[index])
    .filter((place): place is LocatedStop => Boolean(place));
  const used = new Set(seedIndexes);
  const maxSize = Math.ceil(source.length / Math.max(groups.length, 1));
  const remaining = source
    .filter((_, index) => !used.has(index))
    .map((place) => ({
      place,
      nearest: Math.min(...seeds.map((seed) => distanceKm(place, seed))),
    }))
    .sort((left, right) => left.nearest - right.nearest);

  for (const item of remaining) {
    let bestGroup = 0;
    let bestDistance = Infinity;
    for (let index = 0; index < seeds.length; index += 1) {
      const group = groups[index];
      const seed = seeds[index];
      if (!group || !seed || group.length >= maxSize) {
        continue;
      }
      const distance = distanceKm(item.place, seed);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestGroup = index;
      }
    }
    groups[bestGroup]?.push(item.place);
  }

  return orderGroups(padDays(groups, dayCount));
}

function clampDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(14, Math.max(1, Math.floor(value)));
}

function padDays(groups: LocatedStop[][], dayCount: number): LocatedStop[][] {
  const next = groups.map((group) => group.slice());
  while (next.length < dayCount) {
    next.push([]);
  }
  return next.slice(0, dayCount);
}

function pickSeeds(places: LocatedStop[], count: number): number[] {
  let start = 0;
  for (let index = 1; index < places.length; index += 1) {
    const place = places[index];
    const current = places[start];
    if (!place || !current) {
      continue;
    }
    if (
      place.longitude < current.longitude ||
      (place.longitude === current.longitude && place.latitude < current.latitude)
    ) {
      start = index;
    }
  }

  const seeds = [start];
  while (seeds.length < count) {
    let bestIndex = -1;
    let bestDistance = 0;
    for (let index = 0; index < places.length; index += 1) {
      if (seeds.includes(index)) {
        continue;
      }
      const place = places[index];
      if (!place) {
        continue;
      }
      let nearest = Infinity;
      for (const seed of seeds) {
        const seeded = places[seed];
        if (!seeded) {
          continue;
        }
        nearest = Math.min(nearest, distanceKm(place, seeded));
      }
      if (nearest > bestDistance) {
        bestDistance = nearest;
        bestIndex = index;
      }
    }
    if (bestIndex < 0) {
      break;
    }
    seeds.push(bestIndex);
  }
  return seeds;
}

function orderGroups(groups: LocatedStop[][]): LocatedStop[][] {
  const nonempty = groups.filter((group) => group.length > 0);
  const emptyCount = groups.length - nonempty.length;
  if (nonempty.length === 0) {
    return groups;
  }

  const centers = nonempty.map((group) => centroid(group));
  const latitudes = centers.map((center) => center.latitude);
  const longitudes = centers.map((center) => center.longitude);
  const meanLatitude = latitudes.reduce((sum, value) => sum + value, 0) / latitudes.length;
  const latitudeSpan = span(latitudes);
  const longitudeSpan = span(longitudes) * Math.cos((meanLatitude * Math.PI) / 180);
  const northToSouth = latitudeSpan >= longitudeSpan;
  const sorted = nonempty
    .map((stops, index) => ({ stops, center: centers[index] }))
    .sort((left, right) => {
      const leftCenter = left.center;
      const rightCenter = right.center;
      if (!leftCenter || !rightCenter) {
        return 0;
      }
      if (northToSouth) {
        return rightCenter.latitude - leftCenter.latitude;
      }
      return leftCenter.longitude - rightCenter.longitude;
    });

  let previousEnd: { latitude: number; longitude: number } | null = null;
  const ordered = sorted.map((group, index) => {
    const next = sorted[index + 1]?.center ?? null;
    const stops = orderStops(group.stops, previousEnd, next);
    const end = stops[stops.length - 1];
    if (end) {
      previousEnd = end;
    }
    return stops;
  });

  return [...ordered, ...Array.from({ length: emptyCount }, () => [])];
}

function orderStops(
  stops: LocatedStop[],
  startHint: { latitude: number; longitude: number } | null,
  nextCenter: { latitude: number; longitude: number } | null,
): LocatedStop[] {
  if (stops.length <= 1) {
    return stops.slice();
  }
  const remaining = stops.slice();
  const ordered: LocatedStop[] = [];
  if (startHint) {
    ordered.push(takeClosest(remaining, startHint));
  } else if (nextCenter) {
    ordered.push(takeFarthest(remaining, nextCenter));
  } else {
    remaining.sort((left, right) => left.longitude - right.longitude || left.latitude - right.latitude);
    const first = remaining.shift();
    if (first) {
      ordered.push(first);
    }
  }
  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1];
    if (!current) {
      break;
    }
    ordered.push(takeClosest(remaining, current));
  }
  return ordered;
}

function takeClosest(places: LocatedStop[], target: { latitude: number; longitude: number }): LocatedStop {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < places.length; index += 1) {
    const place = places[index];
    if (!place) {
      continue;
    }
    const distance = distanceKm(place, target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return places.splice(bestIndex, 1)[0] as LocatedStop;
}

function takeFarthest(places: LocatedStop[], target: { latitude: number; longitude: number }): LocatedStop {
  let bestIndex = 0;
  let bestDistance = -1;
  for (let index = 0; index < places.length; index += 1) {
    const place = places[index];
    if (!place) {
      continue;
    }
    const distance = distanceKm(place, target);
    if (distance > bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return places.splice(bestIndex, 1)[0] as LocatedStop;
}

function centroid(stops: LocatedStop[]): { latitude: number; longitude: number } {
  return {
    latitude: stops.reduce((sum, stop) => sum + stop.latitude, 0) / stops.length,
    longitude: stops.reduce((sum, stop) => sum + stop.longitude, 0) / stops.length,
  };
}

function span(values: number[]): number {
  return Math.max(...values) - Math.min(...values);
}

function distanceKm(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const latitudeA = toRadians(left.latitude);
  const latitudeB = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}
