import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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

  const stops = useMemo(() => {
    if (route?.stops) return route.stops;
    if (!route?.polyline) return [];
    return [];
  }, [route]);

  const occupancyPct = bus ? Math.min(100, Math.round((bus.occupancy / Math.max(1, bus.capacity)) * 100)) : 0;

  const openInMaps = () => {
    if (!loc) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    Linking.openURL(url);
  };

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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live location</Text>
          {loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number' ? (
            <>
              <Text style={styles.coords}>
                {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
              </Text>
              {loc.speed != null && (
                <Text style={styles.metaText}>Speed: {Math.round(loc.speed)} km/h</Text>
              )}
              <Text style={styles.metaText}>Updated {fmtAgo(loc.timestamp)}</Text>
              <TouchableOpacity style={styles.mapsBtn} onPress={openInMaps}>
                <Text style={styles.mapsBtnText}>Open in Maps</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.metaText}>No live position yet — waiting for the bus to report.</Text>
          )}
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

        {route?.polyline && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Route</Text>
            <Text style={styles.metaText}>
              {(() => {
                try {
                  return `${polyline.decode(route.polyline).length} polyline points`;
                } catch {
                  return 'Polyline available';
                }
              })()}
            </Text>
            {stops.length > 0 && (
              <View style={{ marginTop: 12 }}>
                {stops.map((s, i) => (
                  <View key={i} style={styles.stopRow}>
                    <View style={styles.stopBadge}>
                      <Text style={styles.stopBadgeText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.stopName}>{s.name || `${s.lat}, ${s.lng}`}</Text>
                  </View>
                ))}
              </View>
            )}
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
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#e0e7ff', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  coords: { fontSize: 16, color: '#111', fontWeight: '600', marginBottom: 4, fontVariant: ['tabular-nums'] },
  metaText: { fontSize: 13, color: '#666', marginTop: 2 },
  mapsBtn: {
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  mapsBtnText: { color: '#fff', fontWeight: '600' },
  barTrack: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: '100%', backgroundColor: '#4f46e5' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111' },
  phoneLink: { fontSize: 14, color: '#4f46e5', marginTop: 2 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  stopBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stopName: { fontSize: 13, color: '#111', flex: 1 },
  error: { color: '#dc2626' },
});
