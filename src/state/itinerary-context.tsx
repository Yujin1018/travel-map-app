import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createSampleItinerary } from '@/data/sample-itinerary';
import { itineraryForStorage } from '@/lib/itinerary-storage';
import { draftIsValid, hasCoordinates, isSamePlace, placeLabel } from '@/lib/places';
import { parseItinerary } from '@/state/parse-itinerary';
import type { DayPlan, Itinerary, PlaceDraft, SampleLeg, Stop } from '@/types/itinerary';

const STORAGE_KEY = 'travel-map.itinerary.v1';
const MAX_DAYS = 14;

export type AddPlaceResult = 'added' | 'refreshed' | 'duplicate' | 'invalid';

export type AddManyResult = {
  added: string[];
  duplicates: string[];
};

type ItineraryContextValue = {
  itinerary: Itinerary | null;
  activeDay: DayPlan | null;
  wishlist: Stop[];
  ready: boolean;
  selectDay: (dayId: string) => void;
  addDay: () => 'added' | 'too-many';
  removeDay: (dayId: string) => 'removed' | 'last-day' | 'missing';
  renameDay: (dayId: string, title: string) => void;
  addToWishlist: (place: PlaceDraft) => AddPlaceResult;
  addToDay: (dayId: string, place: PlaceDraft) => AddPlaceResult;
  addManyToWishlist: (places: PlaceDraft[]) => AddManyResult;
  addManyToDay: (dayId: string, places: PlaceDraft[]) => AddManyResult;
  removeStop: (dayId: string, stopId: string) => void;
  moveStop: (dayId: string, stopId: string, direction: -1 | 1) => void;
  moveStopToDay: (fromDayId: string, stopId: string, toDayId: string) => 'moved' | 'duplicate' | 'missing';
  moveStopToWishlist: (dayId: string, stopId: string) => 'moved' | 'duplicate' | 'missing';
  removeWishlistPlace: (stopId: string) => void;
  moveWishlistToDay: (stopId: string, dayId: string) => 'moved' | 'duplicate' | 'missing';
  applyPlan: (groups: Stop[][]) => void;
  replaceItinerary: (next: Itinerary) => 'replaced' | 'invalid';
  resetToSample: () => void;
};

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyDay(index: number): DayPlan {
  const label = `第 ${index} 天`;
  return {
    id: createId('day'),
    dateLabel: label,
    title: label,
    stops: [],
    sampleLegs: [],
  };
}

function normalizeDayLabels(days: DayPlan[]): DayPlan[] {
  return days.map((day, index) => ({
    ...day,
    dateLabel: `第 ${index + 1} 天`,
  }));
}

function allStops(itinerary: Itinerary): Stop[] {
  return [...itinerary.wishlist, ...itinerary.days.flatMap((day) => day.stops)];
}

function containsPlace(
  itinerary: Itinerary,
  place: Pick<Stop, 'name' | 'latitude' | 'longitude' | 'mapboxId' | 'userLabel'>,
  ignoreId?: string,
): boolean {
  return allStops(itinerary).some((stop) => stop.id !== ignoreId && isSamePlace(stop, place));
}

function toStop(draft: PlaceDraft): Stop | null {
  if (!draftIsValid(draft)) {
    return null;
  }
  const source = draft.coordinateSource ?? 'manual';
  const stop: Stop = {
    id: createId('stop'),
    name: draft.name.trim(),
    latitude: draft.latitude,
    longitude: draft.longitude,
    coordinateSource: source,
  };
  const userLabel = draft.userLabel?.trim();
  const mapboxId = draft.mapboxId?.trim();
  const note = draft.note?.trim();
  if (userLabel) {
    stop.userLabel = userLabel.slice(0, 80);
  } else if (source === 'mapbox') {
    stop.userLabel = stop.name;
  }
  if (mapboxId && source === 'mapbox') {
    stop.mapboxId = mapboxId.slice(0, 300);
  }
  if (note) {
    stop.note = note.slice(0, 80);
  }
  return stop;
}

function replaceStop(itinerary: Itinerary, stopId: string, stop: Stop): Itinerary {
  return {
    ...itinerary,
    wishlist: itinerary.wishlist.map((place) => (place.id === stopId ? stop : place)),
    days: itinerary.days.map((day) => ({
      ...day,
      stops: day.stops.map((place) => (place.id === stopId ? stop : place)),
    })),
  };
}

function placeInto(
  itinerary: Itinerary,
  stop: Stop,
  destination: 'wishlist' | string,
): { next: Itinerary; result: 'added' | 'refreshed' | 'duplicate' | 'invalid' } {
  if (stop.coordinateSource === 'mapbox') {
    const duplicate = allStops(itinerary).find((place) => hasCoordinates(place) && isSamePlace(place, stop));
    if (duplicate) {
      return { next: itinerary, result: 'duplicate' };
    }
    const pending = allStops(itinerary).find(
      (place) => !hasCoordinates(place) && placeLabel(place).toLocaleLowerCase() === placeLabel(stop).toLocaleLowerCase(),
    );
    if (pending) {
      return {
        next: replaceStop(itinerary, pending.id, {
          ...pending,
          name: stop.name,
          userLabel: stop.userLabel ?? pending.name,
          latitude: stop.latitude,
          longitude: stop.longitude,
          mapboxId: stop.mapboxId,
          note: stop.note,
          coordinateSource: 'mapbox',
        }),
        result: 'refreshed',
      };
    }
  } else if (containsPlace(itinerary, stop)) {
    return { next: itinerary, result: 'duplicate' };
  }

  if (destination === 'wishlist') {
    return { next: { ...itinerary, wishlist: [...itinerary.wishlist, stop] }, result: 'added' };
  }
  if (!itinerary.days.some((day) => day.id === destination)) {
    return { next: itinerary, result: 'invalid' };
  }
  return {
    next: {
      ...itinerary,
      days: itinerary.days.map((day) =>
        day.id === destination ? { ...day, stops: [...day.stops, stop] } : day,
      ),
    },
    result: 'added',
  };
}

function withoutStop(day: DayPlan, stopId: string): DayPlan {
  return {
    ...day,
    stops: day.stops.filter((stop) => stop.id !== stopId),
    sampleLegs: day.sampleLegs.filter((leg) => leg.fromStopId !== stopId && leg.toStopId !== stopId),
  };
}

function withActiveDay(itinerary: Itinerary, activeDayId: string): Itinerary {
  const days = normalizeDayLabels(itinerary.days.length > 0 ? itinerary.days : [createEmptyDay(1)]);
  const nextActive = days.some((day) => day.id === activeDayId) ? activeDayId : (days[0]?.id ?? activeDayId);
  return { ...itinerary, days, activeDayId: nextActive };
}

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = raw ? parseItinerary(raw) : null;
        if (!cancelled) {
          setItinerary(stored ?? createSampleItinerary());
        }
      } catch {
        if (!cancelled) {
          setItinerary(createSampleItinerary());
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!itinerary) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(itineraryForStorage(itinerary))).catch(() => {});
  }, [itinerary]);

  const selectDay = useCallback((dayId: string) => {
    setItinerary((current) => {
      if (!current || current.activeDayId === dayId || !current.days.some((day) => day.id === dayId)) {
        return current;
      }
      return { ...current, activeDayId: dayId };
    });
  }, []);

  const addDay = useCallback((): 'added' | 'too-many' => {
    if (!itinerary || itinerary.days.length >= MAX_DAYS) {
      return 'too-many';
    }
    const day = createEmptyDay(itinerary.days.length + 1);
    setItinerary(withActiveDay({ ...itinerary, days: [...itinerary.days, day] }, day.id));
    return 'added';
  }, [itinerary]);

  const removeDay = useCallback(
    (dayId: string): 'removed' | 'last-day' | 'missing' => {
      if (!itinerary) {
        return 'missing';
      }
      if (itinerary.days.length <= 1) {
        return 'last-day';
      }
      const day = itinerary.days.find((item) => item.id === dayId);
      if (!day) {
        return 'missing';
      }
      const removedIndex = itinerary.days.findIndex((item) => item.id === dayId);
      const neighbor = itinerary.days[removedIndex + 1] ?? itinerary.days[removedIndex - 1];
      const wishlist = [...itinerary.wishlist];
      for (const stop of day.stops) {
        if (!wishlist.some((place) => place.id === stop.id || isSamePlace(place, stop))) {
          wishlist.push(stop);
        }
      }
      const activeDayId =
        itinerary.activeDayId === dayId ? (neighbor?.id ?? itinerary.activeDayId) : itinerary.activeDayId;
      setItinerary(
        withActiveDay(
          {
            ...itinerary,
            days: itinerary.days.filter((item) => item.id !== dayId),
            wishlist,
          },
          activeDayId,
        ),
      );
      return 'removed';
    },
    [itinerary],
  );

  const renameDay = useCallback((dayId: string, title: string) => {
    const nextTitle = title.trim().slice(0, 40);
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        days: current.days.map((day) => {
          if (day.id !== dayId) {
            return day;
          }
          return { ...day, title: nextTitle || day.dateLabel };
        }),
      };
    });
  }, []);

  const insertPlace = useCallback(
    (draft: PlaceDraft, destination: 'wishlist' | string): AddPlaceResult => {
      if (!itinerary) {
        return 'invalid';
      }
      const stop = toStop(draft);
      if (!stop) {
        return 'invalid';
      }
      const placed = placeInto(itinerary, stop, destination);
      if (placed.result === 'added' || placed.result === 'refreshed') {
        setItinerary(placed.next);
      }
      return placed.result;
    },
    [itinerary],
  );

  const addToWishlist = useCallback((place: PlaceDraft) => insertPlace(place, 'wishlist'), [insertPlace]);

  const addToDay = useCallback(
    (dayId: string, place: PlaceDraft) => insertPlace(place, dayId),
    [insertPlace],
  );

  const addMany = useCallback(
    (drafts: PlaceDraft[], destination: 'wishlist' | string): AddManyResult => {
      const added: string[] = [];
      const duplicates: string[] = [];
      if (!itinerary) {
        return { added, duplicates };
      }
      let next = itinerary;
      for (const draft of drafts) {
        const stop = toStop(draft);
        if (!stop) {
          continue;
        }
        const placed = placeInto(next, stop, destination);
        if (placed.result === 'duplicate') {
          duplicates.push(placeLabel(stop));
          continue;
        }
        if (placed.result === 'invalid') {
          continue;
        }
        next = placed.next;
        added.push(placeLabel(stop));
      }
      if (added.length > 0) {
        setItinerary(next);
      }
      return { added, duplicates };
    },
    [itinerary],
  );

  const addManyToWishlist = useCallback((places: PlaceDraft[]) => addMany(places, 'wishlist'), [addMany]);

  const addManyToDay = useCallback(
    (dayId: string, places: PlaceDraft[]) => addMany(places, dayId),
    [addMany],
  );

  const removeStop = useCallback((dayId: string, stopId: string) => {
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        days: current.days.map((day) => (day.id === dayId ? withoutStop(day, stopId) : day)),
      };
    });
  }, []);

  const moveStop = useCallback((dayId: string, stopId: string, direction: -1 | 1) => {
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        days: current.days.map((day) => {
          if (day.id !== dayId) {
            return day;
          }
          const index = day.stops.findIndex((stop) => stop.id === stopId);
          const nextIndex = index + direction;
          if (index < 0 || nextIndex < 0 || nextIndex >= day.stops.length) {
            return day;
          }
          const stops = day.stops.slice();
          const [item] = stops.splice(index, 1);
          if (!item) {
            return day;
          }
          stops.splice(nextIndex, 0, item);
          return { ...day, stops };
        }),
      };
    });
  }, []);

  const moveStopToDay = useCallback(
    (fromDayId: string, stopId: string, toDayId: string): 'moved' | 'duplicate' | 'missing' => {
      if (!itinerary || fromDayId === toDayId) {
        return 'missing';
      }
      const from = itinerary.days.find((day) => day.id === fromDayId);
      const to = itinerary.days.find((day) => day.id === toDayId);
      const stop = from?.stops.find((item) => item.id === stopId);
      if (!from || !to || !stop) {
        return 'missing';
      }
      if (to.stops.some((item) => isSamePlace(item, stop))) {
        return 'duplicate';
      }
      setItinerary({
        ...itinerary,
        days: itinerary.days.map((day) => {
          if (day.id === fromDayId) {
            return withoutStop(day, stopId);
          }
          if (day.id === toDayId) {
            return { ...day, stops: [...day.stops, stop] };
          }
          return day;
        }),
      });
      return 'moved';
    },
    [itinerary],
  );

  const moveStopToWishlist = useCallback(
    (dayId: string, stopId: string): 'moved' | 'duplicate' | 'missing' => {
      if (!itinerary) {
        return 'missing';
      }
      const day = itinerary.days.find((item) => item.id === dayId);
      const stop = day?.stops.find((item) => item.id === stopId);
      if (!day || !stop) {
        return 'missing';
      }
      if (itinerary.wishlist.some((place) => isSamePlace(place, stop))) {
        return 'duplicate';
      }
      setItinerary({
        ...itinerary,
        wishlist: [...itinerary.wishlist, stop],
        days: itinerary.days.map((item) => (item.id === dayId ? withoutStop(item, stopId) : item)),
      });
      return 'moved';
    },
    [itinerary],
  );

  const removeWishlistPlace = useCallback((stopId: string) => {
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return { ...current, wishlist: current.wishlist.filter((place) => place.id !== stopId) };
    });
  }, []);

  const moveWishlistToDay = useCallback(
    (stopId: string, dayId: string): 'moved' | 'duplicate' | 'missing' => {
      if (!itinerary) {
        return 'missing';
      }
      const stop = itinerary.wishlist.find((place) => place.id === stopId);
      const day = itinerary.days.find((item) => item.id === dayId);
      if (!stop || !day) {
        return 'missing';
      }
      if (day.stops.some((item) => isSamePlace(item, stop))) {
        return 'duplicate';
      }
      setItinerary({
        ...itinerary,
        wishlist: itinerary.wishlist.filter((place) => place.id !== stopId),
        days: itinerary.days.map((item) =>
          item.id === dayId ? { ...item, stops: [...item.stops, stop] } : item,
        ),
      });
      return 'moved';
    },
    [itinerary],
  );

  const applyPlan = useCallback((groups: Stop[][]) => {
    if (groups.length === 0 || groups.every((group) => group.length === 0)) {
      return;
    }
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      const planned = groups.flat();
      const days = groups.map((stops, index) => {
        const label = `第 ${index + 1} 天`;
        const day: DayPlan = {
          id: createId('day'),
          dateLabel: label,
          title: label,
          stops,
          sampleLegs: [] as SampleLeg[],
        };
        return day;
      });
      const normalized = normalizeDayLabels(days);
      return {
        ...current,
        days: normalized,
        activeDayId: normalized[0]?.id ?? current.activeDayId,
        wishlist: current.wishlist.filter(
          (place) => !planned.some((plannedPlace) => plannedPlace.id === place.id || isSamePlace(plannedPlace, place)),
        ),
      };
    });
  }, []);

  const resetToSample = useCallback(() => {
    setItinerary(createSampleItinerary());
  }, []);

  const replaceItinerary = useCallback((next: Itinerary): 'replaced' | 'invalid' => {
    const parsed = parseItinerary(JSON.stringify(itineraryForStorage(next)));
    if (!parsed) {
      return 'invalid';
    }
    setItinerary(parsed);
    return 'replaced';
  }, []);

  const value = useMemo<ItineraryContextValue>(
    () => ({
      itinerary,
      activeDay: itinerary?.days.find((day) => day.id === itinerary.activeDayId) ?? itinerary?.days[0] ?? null,
      wishlist: itinerary?.wishlist ?? [],
      ready: itinerary !== null,
      selectDay,
      addDay,
      removeDay,
      renameDay,
      addToWishlist,
      addToDay,
      addManyToWishlist,
      addManyToDay,
      removeStop,
      moveStop,
      moveStopToDay,
      moveStopToWishlist,
      removeWishlistPlace,
      moveWishlistToDay,
      applyPlan,
      replaceItinerary,
      resetToSample,
    }),
    [
      addDay,
      addManyToDay,
      addManyToWishlist,
      addToDay,
      addToWishlist,
      applyPlan,
      itinerary,
      moveStop,
      moveStopToDay,
      moveStopToWishlist,
      moveWishlistToDay,
      removeDay,
      removeStop,
      removeWishlistPlace,
      renameDay,
      replaceItinerary,
      resetToSample,
      selectDay,
    ],
  );

  return <ItineraryContext value={value}>{children}</ItineraryContext>;
}

export function useItinerary() {
  const value = useContext(ItineraryContext);
  if (!value) {
    throw new Error('useItinerary 必须放在 ItineraryProvider 里');
  }
  return value;
}
