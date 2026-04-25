import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { requestOtp } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    if (!phone.trim()) {
      setError('Enter your phone number.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await requestOtp(phone.trim());
      setStep('otp');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!otp.trim()) {
      setError('Enter the OTP.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await signIn(phone.trim(), otp.trim());
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kb}
      >
        <View style={styles.hero}>
          <Text style={styles.title}>CrowdSync</Text>
          <Text style={styles.subtitle}>Parent portal</Text>
        </View>

        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="+1234567890"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="phone-pad"
                style={styles.input}
              />
              <TouchableOpacity style={styles.button} onPress={sendOtp} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send OTP</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.helper}>OTP sent to {phone}</Text>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
                placeholderTextColor="#999"
                keyboardType="number-pad"
                maxLength={6}
                style={styles.input}
              />
              <TouchableOpacity style={styles.button} onPress={verify} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Sign in</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setStep('phone'); setOtp(''); }}>
                <Text style={styles.link}>Use a different number</Text>
              </TouchableOpacity>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  kb: { flex: 1, padding: 24, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  form: { gap: 12 },
  label: { fontSize: 13, color: '#444', fontWeight: '600' },
  helper: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111',
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#4f46e5', textAlign: 'center', marginTop: 12, fontSize: 13 },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 8, fontSize: 13 },
});
