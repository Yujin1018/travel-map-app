/**
 * 地点搜索走 Mapbox Search Box 的文本搜索。
 * 地理编码 v6 已经不返回景点；寺庙、神社这类地点需要 Search Box，仍然用同一个公开令牌。
 * 不开启到达时间，避免额外的路线计算。
 */
const SEARCH_URL = 'https://api.mapbox.com/search/searchbox/v1/forward';

export type GeocodedPlace = {
  mapboxId: string;
  name: string;
  latitude: number;
  longitude: number;
  locality?: string;
  region?: string;
  country?: string;
};

export type SearchFailure = 'missing-token' | 'invalid-token' | 'rate-limit' | 'request-failed' | 'aborted';

export type SearchResult = { ok: true; places: GeocodedPlace[] } | { ok: false; reason: SearchFailure };

type SearchOptions = {
  token: string | null;
  limit?: number;
  autocomplete?: boolean;
  proximity?: { latitude: number; longitude: number } | null;
  signal?: AbortSignal;
};

export function searchErrorMessage(reason: SearchFailure): string {
  switch (reason) {
    case 'missing-token':
      return '还没有可用的 Mapbox 公开令牌，暂时不能搜索地点。请在 .env 里填写 EXPO_PUBLIC_MAPBOX_TOKEN，保存后重新运行 npx expo start。';
    case 'invalid-token':
      return '公开令牌没有通过校验，搜索没有成功。请检查 .env 里的 EXPO_PUBLIC_MAPBOX_TOKEN 是不是以 pk. 开头。';
    case 'rate-limit':
      return '搜索太频繁，请稍后再试。';
    case 'aborted':
      return '';
    default:
      return '搜索没有成功。请检查网络后再试。';
  }
}

export function formatPlaceContext(place: Pick<GeocodedPlace, 'locality' | 'region' | 'country'>): string {
  const parts: string[] = [];
  for (const part of [place.locality, place.region, place.country]) {
    if (part && !parts.includes(part)) {
      parts.push(part);
    }
  }
  return parts.join(' · ');
}

export function isSearchableQuery(query: string): boolean {
  const value = query.trim();
  if (!value || value.length > 200) {
    return false;
  }
  if (/[\u3400-\u9fff]/.test(value)) {
    return true;
  }
  return value.length >= 2;
}

export async function searchPlaces(query: string, options: SearchOptions): Promise<SearchResult> {
  const text = query.trim().slice(0, 200);
  if (!text) {
    return { ok: true, places: [] };
  }

  const token = options.token?.trim() ?? '';
  if (!token) {
    return { ok: false, reason: 'missing-token' };
  }

  const limit = Math.min(10, Math.max(1, options.limit ?? 5));
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', text);
  url.searchParams.set('access_token', token);
  // Search Box 文档列出的语言不含中文，传 zh 没有依据。查询文字本身仍可以是中文。
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('auto_complete', options.autocomplete === false ? 'false' : 'true');
  if (options.proximity) {
    url.searchParams.set('proximity', `${options.proximity.longitude},${options.proximity.latitude}`);
  }

  try {
    const response = await fetch(url, { signal: options.signal });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'invalid-token' };
    }
    if (response.status === 429) {
      return { ok: false, reason: 'rate-limit' };
    }
    if (!response.ok) {
      return { ok: false, reason: 'request-failed' };
    }
    const payload: unknown = await response.json();
    return { ok: true, places: parseSearchResponse(payload).slice(0, limit) };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'aborted' };
    }
    return { ok: false, reason: 'request-failed' };
  }
}

export function parseSearchResponse(payload: unknown): GeocodedPlace[] {
  if (!isRecord(payload) || !Array.isArray(payload.features)) {
    return [];
  }

  const places: GeocodedPlace[] = [];
  for (const feature of payload.features) {
    const place = parseFeature(feature);
    if (!place || places.some((existing) => existing.mapboxId === place.mapboxId)) {
      continue;
    }
    places.push(place);
  }
  return places;
}

function parseFeature(feature: unknown): GeocodedPlace | null {
  if (!isRecord(feature)) {
    return null;
  }
  const properties = isRecord(feature.properties) ? feature.properties : null;
  if (!properties) {
    return null;
  }

  const name = readText(properties.name_preferred) ?? readText(properties.name);
  const mapboxId = readText(properties.mapbox_id);
  const coordinates = readCoordinates(feature.geometry, properties.coordinates);
  if (!name || !mapboxId || !coordinates) {
    return null;
  }

  const context = isRecord(properties.context) ? properties.context : {};
  const region = readContextName(context.region);
  const country = readContextName(context.country);
  const locality = [context.neighborhood, context.locality, context.place, context.district]
    .map((item) => readContextName(item))
    .find((item) => item && item !== name && item !== region && item !== country);

  const place: GeocodedPlace = {
    mapboxId,
    name,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  };
  if (locality) {
    place.locality = locality;
  }
  if (region && region !== name) {
    place.region = region;
  }
  if (country && country !== name) {
    place.country = country;
  }
  return place;
}

function readCoordinates(
  geometry: unknown,
  coordinates: unknown,
): { latitude: number; longitude: number } | null {
  if (isRecord(geometry) && Array.isArray(geometry.coordinates)) {
    const parsed = readLatLng(geometry.coordinates[1], geometry.coordinates[0]);
    if (parsed) {
      return parsed;
    }
  }
  if (isRecord(coordinates)) {
    return readLatLng(coordinates.latitude, coordinates.longitude);
  }
  return null;
}

function readLatLng(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return { latitude, longitude };
}

function readContextName(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return readText(value.name);
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const text = value.trim();
  return text ? text : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
