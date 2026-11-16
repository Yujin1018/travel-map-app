import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createSampleItinerary } from '@/data/sample-itinerary';
import { parseItinerary } from '@/state/parse-itinerary';
import type { DayPlan, Itinerary, Stop } from '@/types/itinerary';

const STORAGE_KEY = 'travel-map.itinerary.v1';

type NewStop = Pick<Stop, 'name' | 'latitude' | 'longitude'>;

type ItineraryContextValue = {
  itinerary: Itinerary | null;
  activeDay: DayPlan | null;
  ready: boolean;
  addStop: (input: NewStop) => void;
  removeStop: (stopId: string) => void;
  moveStop: (stopId: string, direction: -1 | 1) => void;
  resetToSample: () => void;
};

const ItineraryContext = createContext<ItineraryContextValue | null>(null);

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function withActiveDay(itinerary: Itinerary, update: (day: DayPlan) => DayPlan): Itinerary {
  const current = itinerary.days[0] ?? createSampleItinerary().days[0];
  if (!current) {
    return itinerary;
  }
  return {
    ...itinerary,
    days: [update(current), ...itinerary.days.slice(1)],
  };
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(itinerary)).catch(() => {});
  }, [itinerary]);

  const addStop = useCallback((input: NewStop) => {
    const name = input.name.trim();
    if (!name) {
      return;
    }
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return withActiveDay(current, (day) => ({
        ...day,
        stops: [
          ...day.stops,
          {
            id: createId('stop'),
            name,
            latitude: input.latitude,
            longitude: input.longitude,
          },
        ],
      }));
    });
  }, []);

  const removeStop = useCallback((stopId: string) => {
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return withActiveDay(current, (day) => ({
        ...day,
        stops: day.stops.filter((stop) => stop.id !== stopId),
      }));
    });
  }, []);

  const moveStop = useCallback((stopId: string, direction: -1 | 1) => {
    setItinerary((current) => {
      if (!current) {
        return current;
      }
      return withActiveDay(current, (day) => {
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
      });
    });
  }, []);

  const resetToSample = useCallback(() => {
    setItinerary(createSampleItinerary());
  }, []);

  const value = useMemo<ItineraryContextValue>(
    () => ({
      itinerary,
      activeDay: itinerary?.days[0] ?? null,
      ready: itinerary !== null,
      addStop,
      removeStop,
      moveStop,
      resetToSample,
    }),
    [addStop, itinerary, moveStop, removeStop, resetToSample],
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
