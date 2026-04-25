import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';

export default function Profile() {
  const { parent, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {parent?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{parent?.name ?? 'Parent'}</Text>
        <Text style={styles.phone}>{parent?.phone}</Text>
        {parent?.email && <Text style={styles.email}>{parent.email}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Account</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Phone</Text>
          <Text style={styles.rowValue}>{parent?.phone}</Text>
        </View>
        {parent?.email && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{parent.email}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.signOut} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa', padding: 20 },
  header: { alignItems: 'center', marginTop: 12, marginBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#4f46e5', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', color: '#111' },
  phone: { fontSize: 14, color: '#666', marginTop: 2 },
  email: { fontSize: 13, color: '#888', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 14, color: '#666' },
  rowValue: { fontSize: 14, color: '#111', fontWeight: '500' },
  signOut: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
