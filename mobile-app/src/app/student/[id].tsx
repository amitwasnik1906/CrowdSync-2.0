import { Link, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getParentStudents, type Student } from '@/api/parents';
import { getStudentAttendance, type AttendanceRecord } from '@/api/students';
import { useAuth } from '@/context/AuthContext';

function fmtTime(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StudentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const studentId = Number(id);
  const { parent } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!parent || !studentId) return;
      try {
        const [siblings, att] = await Promise.all([
          getParentStudents(parent.id),
          getStudentAttendance(studentId),
        ]);
        const me = siblings.find((s) => s.id === studentId) || null;
        setStudent(me);
        setRecords(att);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, [parent, studentId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (error || !student) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error || 'Student not found'}</Text>
      </SafeAreaView>
    );
  }

  const today = records[0];
  const onBusNow = !!today?.entryTime && !today?.exitTime;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.meta}>{student.class}</Text>
          <View style={[styles.statusPill, onBusNow ? styles.pillLive : styles.pillIdle]}>
            <Text style={[styles.statusText, onBusNow ? styles.pillLiveText : styles.pillIdleText]}>
              {onBusNow ? 'On bus now' : 'Off bus'}
            </Text>
          </View>
        </View>

        {student.bus && (
          <Link href={{ pathname: '/bus/[id]', params: { id: String(student.bus.id) } }} asChild>
            <TouchableOpacity activeOpacity={0.7} style={styles.busCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.busLabel}>Assigned bus</Text>
                <Text style={styles.busNumber}>{student.bus.busNumber}</Text>
                <Text style={styles.busRoute}>{student.bus.routeName}</Text>
              </View>
              <Text style={styles.cta}>Track ›</Text>
            </TouchableOpacity>
          </Link>
        )}

        <Text style={styles.sectionTitle}>Attendance history</Text>

        {records.length === 0 ? (
          <Text style={styles.empty}>No records yet.</Text>
        ) : (
          records.map((r) => (
            <View key={r.id} style={styles.attRow}>
              <View style={styles.attDate}>
                <Text style={styles.attDateText}>{fmtDate(r.date)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.attLine}>
                  <Text style={styles.attLabel}>Entry</Text>
                  <Text style={styles.attValue}>{fmtTime(r.entryTime)}</Text>
                </View>
                <View style={styles.attLine}>
                  <Text style={styles.attLabel}>Exit</Text>
                  <Text style={styles.attValue}>{fmtTime(r.exitTime)}</Text>
                </View>
                {r.locationName && (
                  <Text style={styles.attLoc}>📍 {r.locationName}</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f7fa' },
  scroll: { padding: 20, paddingBottom: 40 },
  heroCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 12, alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '700', color: '#111' },
  meta: { fontSize: 14, color: '#666', marginTop: 2 },
  statusPill: { marginTop: 12, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  pillLive: { backgroundColor: '#dcfce7' },
  pillIdle: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 12, fontWeight: '600' },
  pillLiveText: { color: '#15803d' },
  pillIdleText: { color: '#475569' },
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  busLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  busNumber: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 2 },
  busRoute: { fontSize: 13, color: '#666', marginTop: 2 },
  cta: { color: '#4f46e5', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  attRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 14,
  },
  attDate: { width: 90 },
  attDateText: { fontSize: 13, fontWeight: '600', color: '#111' },
  attLine: { flexDirection: 'row', justifyContent: 'space-between' },
  attLabel: { fontSize: 13, color: '#666' },
  attValue: { fontSize: 13, color: '#111', fontWeight: '500' },
  attLoc: { fontSize: 11, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#888', marginTop: 16 },
  error: { color: '#dc2626' },
});
