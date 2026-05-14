import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_DEFAULT } from 'react-native-maps';
import polyline from '@mapbox/polyline';

import {
  getBusHistoryDates,
  getBusHistory,
  getBusRoute,
  type BusDayHistory,
  type BusRoute,
} from '@/api/buses';

const COLOR_PLANNED = '#94a3b8';
const COLOR_TRAVELED = '#4f46e5';

function fmtDate(iso: string) {
  try {
    return new Date(`${iso}T00:00:00.000Z`).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function BusHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const busId = Number(id);

  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [history, setHistory] = useState<BusDayHistory | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    if (!busId) return;
    (async () => {
      try {
        const [list, r] = await Promise.all([
          getBusHistoryDates(busId),
          getBusRoute(busId).catch(() => null),
        ]);
        setDates(list);
        setRoute(r);
        if (list.length > 0) setSelectedDate(list[0]);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load history dates');
      } finally {
        setLoadingDates(false);
      }
    })();
  }, [busId]);

  useEffect(() => {
    if (!busId || !selectedDate) {
      setHistory(null);
      return;
    }
    setLoadingHistory(true);
    setError(null);
    getBusHistory(busId, selectedDate)
      .then((h) => setHistory(h))
      .catch((e) => {
        setHistory(null);
        setError(e?.response?.data?.error || 'No history for this date');
      })
      .finally(() => setLoadingHistory(false));
  }, [busId, selectedDate]);

  const coords = useMemo(
    () =>
      (history?.points ?? []).map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      })),
    [history]
  );

  const plannedCoords = useMemo(() => {
    if (!route?.polyline) return [] as { latitude: number; longitude: number }[];
    try {
      return polyline
        .decode(route.polyline)
        .map(([latitude, longitude]) => ({ latitude, longitude }));
    } catch {
      return [];
    }
  }, [route]);

  const plannedStops = route?.stops ?? [];

  useEffect(() => {
    if (!mapRef.current) return;
    const pts = [...coords, ...plannedCoords];
    plannedStops.forEach((s) => pts.push({ latitude: s.lat, longitude: s.lng }));
    if (pts.length === 0) return;
    if (pts.length === 1) {
      mapRef.current.animateToRegion({
        ...pts[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      return;
    }
    mapRef.current.fitToCoordinates(pts, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [coords, plannedCoords, plannedStops]);

  const initialRegion = useMemo(() => {
    const seed = coords[0] ?? plannedCoords[0];
    if (seed) {
      return {
        ...seed,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 30,
      longitudeDelta: 30,
    };
  }, [coords, plannedCoords]);

  if (loadingDates) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.dateBar}>
          <Text style={styles.dateBarLabel}>Pick a date</Text>
          {dates.length === 0 ? (
            <Text style={styles.emptyText}>No history recorded yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dates.map((d) => {
                const active = d === selectedDate;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setSelectedDate(d)}
                    style={[styles.datePill, active && styles.datePillActive]}
                  >
                    <Text
                      style={[
                        styles.datePillText,
                        active && styles.datePillTextActive,
                      ]}
                    >
                      {fmtDate(d)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={initialRegion}
          >
            {coords.length > 1 && (
              <MapPolyline
                coordinates={coords}
                strokeColor={COLOR_TRAVELED}
                strokeWidth={4}
              />
            )}
            {plannedCoords.length > 1 && (
              <MapPolyline
                coordinates={plannedCoords}
                strokeColor={COLOR_PLANNED}
                strokeWidth={5}
                lineDashPattern={[6, 6]}
              />
            )}
            {plannedStops.map((s, i) => (
              <Marker
                key={`planned-stop-${i}`}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                title={s.name || `Stop ${i + 1}`}
                description="Planned stop"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.plannedStopMarker}>
                  <Text style={styles.plannedStopMarkerText}>{i + 1}</Text>
                </View>
              </Marker>
            ))}
          </MapView>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatchSolid, { backgroundColor: COLOR_TRAVELED }]} />
              <Text style={styles.legendText}>Traveled</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatchDashed, { borderColor: COLOR_PLANNED }]} />
              <Text style={styles.legendText}>Planned</Text>
            </View>
          </View>
          {loadingHistory && (
            <View style={styles.mapBadge}>
              <ActivityIndicator size="small" />
              <Text style={styles.mapBadgeText}>  Loading…</Text>
            </View>
          )}
        </View>

        {error && !loadingHistory && (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {history && coords.length < 2 && !loadingHistory && (
          <View style={styles.card}>
            <Text style={styles.metaText}>
              Not enough movement data recorded for this date to draw a route.
            </Text>
          </View>
        )}

        {history?.driver && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver on {fmtDate(history.date)}</Text>
            <Text style={styles.driverName}>{history.driver.name}</Text>
            <TouchableOpacity
              onPress={() => Linking.openURL(`tel:${history.driver!.phone}`)}
            >
              <Text style={styles.phoneLink}>{history.driver.phone}</Text>
            </TouchableOpacity>
          </View>
        )}

        {history && history.driver === null && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver</Text>
            <Text style={styles.metaText}>
              No driver was assigned to this bus on this date.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f7f7fa',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  dateBar: { marginBottom: 12 },
  dateBarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 999,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  datePillText: { fontSize: 13, color: '#111', fontWeight: '500' },
  datePillTextActive: { color: '#fff' },
  emptyText: { fontSize: 13, color: '#666' },
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    height: 320,
  },
  map: { flex: 1 },
  mapBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    elevation: 2,
  },
  mapBadgeText: { fontSize: 12, color: '#111', fontWeight: '500' },
  legend: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    elevation: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  legendSwatchSolid: {
    width: 18,
    height: 4,
    borderRadius: 2,
    marginRight: 8,
  },
  legendSwatchDashed: {
    width: 18,
    height: 0,
    borderTopWidth: 3,
    borderStyle: 'dashed',
    marginRight: 8,
  },
  legendText: { fontSize: 12, color: '#111', fontWeight: '500' },
  plannedStopMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLOR_PLANNED,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plannedStopMarkerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaText: { fontSize: 13, color: '#666' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111' },
  phoneLink: { fontSize: 14, color: '#4f46e5', marginTop: 2 },
  errorText: { color: '#dc2626', fontSize: 13 },
});
