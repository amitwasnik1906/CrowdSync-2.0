import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listNotifications, type Notification } from '@/api/notifications';
import { useAuth } from '@/context/AuthContext';
import { useParentSocket } from '@/lib/socket';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return d.toLocaleDateString();
}

export default function Notifications() {
  const { parent } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!parent) return;
    try {
      const list = await listNotifications(parent.id);
      setItems(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parent]);

  useEffect(() => {
    load();
  }, [load]);

  useParentSocket(parent?.id ?? null, (n) => {
    setItems((prev) => [n, ...prev]);
  });

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
        <Text style={styles.title}>Notifications</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>You're all caught up.</Text>
        ) : (
          items.map((n) => (
            <View key={n.id} style={[styles.card, !n.read && styles.cardUnread]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{n.title}</Text>
                <Text style={styles.time}>{formatTime(n.createdAt)}</Text>
              </View>
              <Text style={styles.body}>{n.body}</Text>
              <Text style={styles.type}>{n.type}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  cardUnread: { borderLeftColor: '#4f46e5' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
  time: { fontSize: 11, color: '#888', marginLeft: 8 },
  body: { fontSize: 13, color: '#444', lineHeight: 18 },
  type: { fontSize: 10, color: '#888', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { textAlign: 'center', color: '#888', marginTop: 32 },
});
