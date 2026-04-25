import { Link } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getParentStudents, type Student } from '@/api/parents';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { parent } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parent) return;
    try {
      const list = await getParentStudents(parent.id);
      setStudents(list);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load students');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parent]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.name}>{parent?.name ?? 'Parent'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Your children</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : students.length === 0 ? (
          <Text style={styles.empty}>No children linked to your account yet.</Text>
        ) : (
          students.map((s) => (
            <Link key={s.id} href={{ pathname: '/student/[id]', params: { id: String(s.id) } }} asChild>
              <TouchableOpacity activeOpacity={0.7} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {s.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardSub}>{s.class}</Text>
                  {s.bus && (
                    <View style={styles.busRow}>
                      <Text style={styles.busBadge}>{s.bus.busNumber}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>{s.bus.routeName}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </Link>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  greeting: { fontSize: 14, color: '#666' },
  name: { fontSize: 26, fontWeight: '700', color: '#111' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  cardBody: { flex: 1, marginLeft: 12, marginRight: 8 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#4f46e5', fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 13, color: '#666' },
  busRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  busBadge: {
    backgroundColor: '#eef2ff',
    color: '#4f46e5',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 8,
    overflow: 'hidden',
  },
  chevron: { color: '#bbb', fontSize: 24 },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
  error: { textAlign: 'center', color: '#dc2626', marginTop: 32 },
});
