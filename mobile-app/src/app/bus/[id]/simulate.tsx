import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline as MapPolyline, PROVIDER_DEFAULT } from 'react-native-maps';
import polyline from '@mapbox/polyline';

import { getBus, getBusRoute, type Bus, type BusRoute } from '@/api/buses';

const COLOR_PLANNED = '#fde68a';
const COLOR_TRAVELED = '#4f46e5';
const DURATION_MS = 480000;
const CAMERA_PITCH = 30;
const INITIAL_ZOOM = 17;

export default function BusSimulate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const busId = Number(id);

  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTsRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!busId) return;
      try {
        const [b, r] = await Promise.all([
          getBus(busId),
          getBusRoute(busId).catch(() => null),
        ]);
        if (cancelled) return;
        setBus(b);
        setRoute(r);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.error || 'Failed to load bus');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [busId]);

  const routeCoords = useMemo(() => {
    if (!route?.polyline) return [] as { latitude: number; longitude: number }[];
    try {
      return polyline
        .decode(route.polyline)
        .map(([latitude, longitude]) => ({ latitude, longitude }));
    } catch {
      return [];
    }
  }, [route]);

  const stops = route?.stops ?? [];

  useEffect(() => {
    if (routeCoords.length < 2) return;
    setProgress(0);
    setDone(false);
    startTsRef.current = null;

    const tick = (ts: number) => {
      if (startTsRef.current == null) startTsRef.current = ts;
      const elapsed = ts - startTsRef.current;
      const p = Math.min(1, elapsed / DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        setDone(true);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [routeCoords]);

  const { busPos, traveled, heading } = useMemo(() => {
    if (routeCoords.length < 2) {
      return {
        busPos: null as { latitude: number; longitude: number } | null,
        traveled: [] as { latitude: number; longitude: number }[],
        heading: 0,
      };
    }
    const f = progress * (routeCoords.length - 1);
    const i = Math.min(routeCoords.length - 2, Math.floor(f));
    const t = f - i;
    const a = routeCoords[i];
    const b = routeCoords[i + 1];
    const pos = {
      latitude: a.latitude + (b.latitude - a.latitude) * t,
      longitude: a.longitude + (b.longitude - a.longitude) * t,
    };
    const trail = routeCoords.slice(0, i + 1).concat([pos]);
    const dLng = (b.longitude - a.longitude) * Math.cos((a.latitude * Math.PI) / 180);
    const dLat = b.latitude - a.latitude;
    const h = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    return { busPos: pos, traveled: trail, heading: h };
  }, [routeCoords, progress]);

  const initialZoomAppliedRef = useRef(false);

  useEffect(() => {
    if (!busPos || !mapRef.current) return;
    const camera: {
      center: { latitude: number; longitude: number };
      heading: number;
      pitch: number;
      zoom?: number;
    } = {
      center: busPos,
      heading,
      pitch: CAMERA_PITCH,
    };
    if (!initialZoomAppliedRef.current) {
      camera.zoom = INITIAL_ZOOM;
      initialZoomAppliedRef.current = true;
    }
    mapRef.current.animateCamera(camera, { duration: 0 });
  }, [busPos, heading]);

  const initialRegion = useMemo(() => {
    if (routeCoords.length > 0) {
      return {
        ...routeCoords[0],
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 30,
      longitudeDelta: 30,
    };
  }, [routeCoords]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !bus) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error || 'Bus not found'}</Text>
      </SafeAreaView>
    );
  }

  const hasRoute = routeCoords.length >= 2;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.busNumber}>{bus.busNumber}</Text>
          <Text style={styles.routeName}>{bus.routeName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.statusText}>Live</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          {hasRoute ? (
            <MapView
              ref={mapRef}
              provider={PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={initialRegion}
              rotateEnabled={false}
              scrollEnabled={false}
              zoomEnabled
              pitchEnabled={false}
            >
              <MapPolyline
                coordinates={routeCoords}
                strokeColor={COLOR_PLANNED}
                strokeWidth={5}
                lineDashPattern={[6, 6]}
              />
              {traveled.length > 1 && (
                <MapPolyline
                  coordinates={traveled}
                  strokeColor={COLOR_TRAVELED}
                  strokeWidth={4}
                />
              )}
              {stops.map((s, i) => (
                <Marker
                  key={`stop-${i}`}
                  coordinate={{ latitude: s.lat, longitude: s.lng }}
                  title={s.name || `Stop ${i + 1}`}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={styles.plannedStopMarker}>
                    <Text style={styles.plannedStopMarkerText}>{i + 1}</Text>
                  </View>
                </Marker>
              ))}
              {busPos && (
                <Marker
                  coordinate={busPos}
                  title={bus.busNumber}
                  anchor={{ x: 0.5, y: 0.5 }}
                  flat
                >
                  <View style={styles.busMarker}>
                    <Text style={styles.busMarkerText}>🚌</Text>
                  </View>
                </Marker>
              )}
            </MapView>
          ) : (
            <View style={styles.noRoute}>
              <Text style={styles.noRouteText}>No route to simulate</Text>
            </View>
          )}

          {done && (
            <View style={styles.completePill}>
              <Text style={styles.completePillText}>✓ Trip complete</Text>
            </View>
          )}

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
        </View>

        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push(`/bus/${busId}/history` as never)}
        >
          <Text style={styles.historyButtonText}>View past dates</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  hero: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 20, marginBottom: 16 },
  busNumber: { color: '#fff', fontSize: 24, fontWeight: '700' },
  routeName: { color: '#c7d2fe', fontSize: 14, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#e0e7ff', fontSize: 12 },
  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    height: 480,
  },
  map: { flex: 1 },
  noRoute: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noRouteText: { color: '#888', fontSize: 14 },
  completePill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 3,
  },
  completePillText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  legendSwatchSolid: { width: 18, height: 4, borderRadius: 2, marginRight: 8 },
  legendSwatchDashed: {
    width: 18,
    height: 0,
    borderTopWidth: 3,
    borderStyle: 'dashed',
    marginRight: 8,
  },
  legendText: { fontSize: 12, color: '#111', fontWeight: '500' },
  busMarker: {
    backgroundColor: '#10b981',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 3,
  },
  busMarkerText: { fontSize: 18 },
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
  plannedStopMarkerText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  historyButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  historyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#dc2626' },
});
