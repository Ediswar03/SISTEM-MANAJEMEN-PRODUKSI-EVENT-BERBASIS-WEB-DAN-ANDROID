import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { api, AssignmentInfo, clearTokens, ApiError } from '../lib/api';
import { COLORS, FONTS } from '../theme';

interface Props {
  onLogout: () => void;
  onSelectEvent: (eventId: string, assignmentId: string) => void;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#6b7280',
  CONFIRMED: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#22c55e',
  CANCELLED: '#ef4444',
};

const JOB_STATUS_COLOR: Record<string, string> = {
  ASSIGNED: '#6366f1',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#22c55e',
  NO_SHOW: '#ef4444',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ScheduleScreen({ onLogout, onSelectEvent }: Props) {
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [meRes, schedRes] = await Promise.all([api.getMe(), api.getMySchedule()]);
      setUserName(meRes.data.fullName);
      setAssignments(schedRes.data);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await clearTokens();
        onLogout();
        return;
      }
      setError('Failed to load schedule. Pull to refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onLogout]);

  useEffect(() => { void load(); }, [load]);

  async function handleLogout() {
    await api.logout();
    onLogout();
  }

  function renderItem({ item }: { item: AssignmentInfo }) {
    const ev = item.event;
    if (!ev) return null;
    const color = STATUS_COLOR[ev.status] ?? '#6b7280';
    const jobColor = JOB_STATUS_COLOR[item.jobStatus] ?? '#6b7280';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onSelectEvent(ev.id, item.id)}
        activeOpacity={0.8}
      >
        {/* Status strip */}
        <View style={[styles.strip, { backgroundColor: color }]} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.eventCode}>{ev.code}</Text>
            <View style={[styles.badge, { backgroundColor: `${jobColor}25`, borderColor: `${jobColor}60` }]}>
              <Text style={[styles.badgeText, { color: jobColor }]}>
                {item.jobStatus.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <Text style={styles.eventName} numberOfLines={1}>{ev.name}</Text>
          <Text style={styles.location} numberOfLines={1}>📍 {ev.location}</Text>

          <View style={styles.cardFooter}>
            <Text style={styles.role}>🎭 {item.roleInEvent}</Text>
            <Text style={styles.time}>
              {formatDate(item.startAt)} · {formatTime(item.startAt)}–{formatTime(item.endAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Schedule</Text>
          {userName ? <Text style={styles.headerSub}>{userName}</Text> : null}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={assignments.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); void load(true); }}
              tintColor={COLORS.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No Assignments</Text>
              <Text style={styles.emptyText}>You have no upcoming event assignments.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: FONTS.bold,
  },
  headerSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoutText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  list: { padding: 16, gap: 12 },
  emptyContainer: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', fontFamily: FONTS.regular },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8, fontFamily: FONTS.bold },
  emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', fontFamily: FONTS.regular },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  strip: { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventCode: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium, letterSpacing: 0.5 },
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '600', fontFamily: FONTS.medium },
  eventName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', fontFamily: FONTS.bold, marginBottom: 4 },
  location: { color: COLORS.textMuted, fontSize: 12, marginBottom: 10, fontFamily: FONTS.regular },
  cardFooter: { gap: 4 },
  role: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.regular },
  time: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },
});
