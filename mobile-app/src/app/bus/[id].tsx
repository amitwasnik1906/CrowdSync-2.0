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
  getBus,
  getBusLocation,
  getBusRoute,
  type Bus,
  type BusLocation,
  type BusRoute,
} from '@/api/buses';
import { useBusSocket, useSocketStatus } from '@/lib/socket';

function fmtAgo(iso?: string | null) {
  if (!iso) return '—';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

export default function BusDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const busId = Number(id);
  const [bus, setBus] = useState<Bus | null>(null);
  const [route, setRoute] = useState<BusRoute | null>(null);
  const [loc, setLoc] = useState<BusLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const connected = useSocketStatus();
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    (async () => {
      if (!busId) return;
      try {
        const [b, r, l] = await Promise.all([
          getBus(busId),
          getBusRoute(busId).catch(() => null),
          getBusLocation(busId).catch(() => null),
        ]);
        setBus(b);
        setRoute(r);
        if (l) setLoc(l);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load bus');
      } finally {
        setLoading(false);
      }
    })();
  }, [busId]);

  useBusSocket(busId || null, (update) => {
    setLoc(update);
  });

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

  // Auto-fit the map to the polyline + stops + bus position when route loads
  useEffect(() => {
    if (!mapRef.current) return;
    const points: { latitude: number; longitude: number }[] = [...routeCoords];
    stops.forEach((s) => points.push({ latitude: s.lat, longitude: s.lng }));
    if (loc?.latitude != null && loc?.longitude != null) {
      points.push({ latitude: loc.latitude, longitude: loc.longitude });
    }
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current.animateToRegion({
        ...points[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      return;
    }
    mapRef.current.fitToCoordinates(points, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }, [routeCoords, stops, loc?.latitude, loc?.longitude]);

  const occupancyPct = bus
    ? Math.min(100, Math.round((bus.occupancy / Math.max(1, bus.capacity)) * 100))
    : 0;

  const initialRegion = useMemo(() => {
    if (loc?.latitude != null && loc?.longitude != null) {
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (routeCoords.length > 0) {
      return {
        ...routeCoords[0],
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    if (stops.length > 0) {
      return {
        latitude: stops[0].lat,
        longitude: stops[0].lng,
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
  }, [loc?.latitude, loc?.longitude, routeCoords, stops]);

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

  const hasLive = loc?.latitude != null && loc?.longitude != null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.busNumber}>{bus.busNumber}</Text>
          <Text style={styles.routeName}>{bus.routeName}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: connected ? '#10b981' : '#94a3b8' }]} />
            <Text style={styles.statusText}>{connected ? 'Live' : 'Offline'}</Text>
          </View>
        </View>

        <View style={styles.mapCard}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={initialRegion}
          >
            {routeCoords.length > 0 && (
              <MapPolyline coordinates={routeCoords} strokeColor="#4f46e5" strokeWidth={4} />
            )}
            {stops.map((s, i) => (
              <Marker
                key={`stop-${i}`}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                title={s.name || `Stop ${i + 1}`}
                description={`Stop ${i + 1}`}
                pinColor="#4f46e5"
              />
            ))}
            {hasLive && (
              <Marker
                coordinate={{ latitude: loc!.latitude, longitude: loc!.longitude }}
                title={bus.busNumber}
                description={connected ? 'Live position' : 'Last known position'}
              >
                <View style={styles.busMarker}>
                  <Text style={styles.busMarkerText}>🚌</Text>
                </View>
              </Marker>
            )}
          </MapView>
          <View style={styles.mapBadge}>
            <View style={[styles.dot, { backgroundColor: hasLive && connected ? '#10b981' : '#94a3b8' }]} />
            <Text style={styles.mapBadgeText}>
              {hasLive
                ? connected
                  ? `Updated ${fmtAgo(loc!.timestamp)}`
                  : 'Last known position'
                : 'Waiting for the bus to report'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Occupancy</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${occupancyPct}%` }]} />
          </View>
          <Text style={styles.metaText}>
            {bus.occupancy} / {bus.capacity} seats ({occupancyPct}%)
          </Text>
        </View>

        {bus.driver && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Driver</Text>
            <Text style={styles.driverName}>{bus.driver.name}</Text>
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${bus.driver!.phone}`)}>
              <Text style={styles.phoneLink}>{bus.driver.phone}</Text>
            </TouchableOpacity>
          </View>
        )}

        {stops.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stops</Text>
            <View style={{ marginTop: 8 }}>
              {stops.map((s, i) => (
                <View key={i} style={styles.stopRow}>
                  <View style={styles.stopBadge}>
                    <Text style={styles.stopBadgeText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stopName}>{s.name || `${s.lat}, ${s.lng}`}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
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
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  mapBadgeText: { fontSize: 12, color: '#111', fontWeight: '500' },
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaText: { fontSize: 13, color: '#666', marginTop: 2 },
  barTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: '#4f46e5' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111' },
  phoneLink: { fontSize: 14, color: '#4f46e5', marginTop: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stopBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stopName: { fontSize: 13, color: '#111', flex: 1 },
  error: { color: '#dc2626' },
});
