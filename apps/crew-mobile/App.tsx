import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getAccessToken } from './src/lib/api';
import LoginScreen from './src/screens/LoginScreen';
import ScheduleScreen from './src/screens/ScheduleScreen';
import EventDetailScreen from './src/screens/EventDetailScreen';
import { COLORS } from './src/theme';

type Screen =
  | { name: 'loading' }
  | { name: 'login' }
  | { name: 'schedule' }
  | { name: 'event'; eventId: string; assignmentId: string };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' });

  // Check if user is already logged in on startup
  useEffect(() => {
    getAccessToken().then((token) => {
      setScreen({ name: token ? 'schedule' : 'login' });
    });
  }, []);

  if (screen.name === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={COLORS.bg} />

      {screen.name === 'login' && (
        <LoginScreen onLogin={() => setScreen({ name: 'schedule' })} />
      )}

      {screen.name === 'schedule' && (
        <ScheduleScreen
          onLogout={() => setScreen({ name: 'login' })}
          onSelectEvent={(eventId, assignmentId) =>
            setScreen({ name: 'event', eventId, assignmentId })
          }
        />
      )}

      {screen.name === 'event' && (
        <EventDetailScreen
          eventId={screen.eventId}
          assignmentId={screen.assignmentId}
          onBack={() => setScreen({ name: 'schedule' })}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
