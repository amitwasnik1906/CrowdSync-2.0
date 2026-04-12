import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';

const STORAGE_KEY = 'bus-location-sender-settings';
const DEFAULT_API_URL = 'http://localhost:5000';
const SEND_INTERVAL_MS = 5000;

export default function SenderScreen() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [token, setToken] = useState('');
  const [busId, setBusId] = useState('');
  const [running, setRunning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastSend, setLastSend] = useState<Date | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const latestRef = useRef<Location.LocationObject | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const s = JSON.parse(raw);
        if (s.apiUrl) setApiUrl(s.apiUrl);
        if (s.token) setToken(s.token);
        if (s.busId) setBusId(String(s.busId));
      } catch {}
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ apiUrl, token, busId })).catch(() => {});
  }, [apiUrl, token, busId]);

  const pushLog = (line: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...prev].slice(0, 30));

  const sendLocation = () => {
    const loc = latestRef.current;
    const socket = socketRef.current;
    if (!loc || !socket || !socket.connected) return;

    socket.emit(
      'busLocation',
      {
        busId: parseInt(busId, 10),
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        speed: loc.coords.speed || undefined,
      },
      (ack: { ok: boolean; error?: string }) => {
        if (ack?.ok) {
          setLastSend(new Date());
          pushLog(`sent ${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
        } else {
          pushLog(`server: ${ack?.error || 'no ack'}`);
        }
      },
    );
  };

  const start = async () => {
    if (!busId) return pushLog('set a bus id first');
    if (!apiUrl) return pushLog('set api url first');
    if (!token) return pushLog('set jwt first');

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return pushLog('location permission denied');

    const socket = io(apiUrl, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      pushLog(`ws connected (${socket.id})`);
    });
    socket.on('disconnect', (reason) => {
      setConnected(false);
      pushLog(`ws disconnected: ${reason}`);
    });
    socket.on('connect_error', (err) => pushLog(`ws error: ${err.message}`));

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
      (loc) => {
        latestRef.current = loc;
      },
    );

    intervalRef.current = setInterval(sendLocation, SEND_INTERVAL_MS);
    setRunning(true);
    pushLog('started');
  };

  const stop = () => {
    try {
      subscriptionRef.current?.remove();
    } catch {}
    subscriptionRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    latestRef.current = null;
    setRunning(false);
    setConnected(false);
    pushLog('stopped');
  };

  useEffect(() => () => stop(), []);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Bus Location Sender</Text>
        <Text style={styles.subtitle}>Broadcasts GPS over WebSocket</Text>

        <View style={styles.card}>
          <Text style={styles.label}>API URL</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://192.168.1.10:5000"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!running}
          />

          <Text style={styles.label}>Bus System JWT</Text>
          <TextInput
            style={styles.input}
            value={token}
            onChangeText={setToken}
            placeholder="eyJhbGciOi..."
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!running}
          />

          <Text style={styles.label}>Bus ID</Text>
          <TextInput
            style={styles.input}
            value={busId}
            onChangeText={setBusId}
            placeholder="1"
            placeholderTextColor="#64748b"
            keyboardType="number-pad"
            editable={!running}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, running ? styles.buttonStop : styles.buttonStart]}
          onPress={running ? stop : start}
          activeOpacity={0.85}>
          <Text style={styles.buttonText}>{running ? 'Stop' : 'Start'}</Text>
        </TouchableOpacity>

        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: connected ? '#10b981' : running ? '#f59e0b' : '#94a3b8' },
            ]}
          />
          <Text style={styles.statusText}>
            {connected ? 'Connected' : running ? 'Connecting…' : 'Idle'}
            {lastSend ? `  ·  last ${lastSend.toLocaleTimeString()}` : ''}
          </Text>
          {running && !latestRef.current ? (
            <ActivityIndicator size="small" color="#6366f1" style={{ marginLeft: 8 }} />
          ) : null}
        </View>

        <View style={styles.logCard}>
          <Text style={styles.logTitle}>Activity</Text>
          {log.length === 0 ? (
            <Text style={styles.logEmpty}>No events yet</Text>
          ) : (
            log.map((line, i) => (
              <Text key={i} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  container: { padding: 20, paddingTop: 60, paddingBottom: 40 },
  title: { color: '#f1f5f9', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 2, marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonStart: { backgroundColor: '#6366f1' },
  buttonStop: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusText: { color: '#cbd5e1', fontSize: 13 },
  logCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16 },
  logTitle: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  logEmpty: { color: '#64748b', fontSize: 13, fontStyle: 'italic' },
  logLine: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginVertical: 1,
  },
});
