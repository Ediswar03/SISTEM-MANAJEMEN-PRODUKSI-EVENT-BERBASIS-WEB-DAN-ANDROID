import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { api, EventDetail, ApiError } from '../lib/api';
import { COLORS, FONTS } from '../theme';

interface Props {
  eventId: string;
  assignmentId: string;
  onBack: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: '#6b7280', CONFIRMED: '#6366f1',
  IN_PROGRESS: '#f59e0b', COMPLETED: '#22c55e', CANCELLED: '#ef4444',
};

const JOB_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW'];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export default function EventDetailScreen({ eventId, assignmentId, onBack }: Props) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getEvent(eventId);
      setEvent(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { void load(); }, [load]);

  const myAssignment = event?.assignments.find((a) => a.id === assignmentId);

  async function updateJobStatus(jobStatus: string) {
    if (!myAssignment) return;
    Alert.alert(
      'Update Status',
      `Set job status to "${jobStatus.replace('_', ' ')}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setUpdating(true);
            try {
              await api.updateAssignment(eventId, assignmentId, { jobStatus });
              await load();
            } catch (e) {
              Alert.alert('Error', e instanceof ApiError ? e.message : 'Update failed.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Event not found.'}</Text>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = STATUS_COLOR[event.status] ?? '#6b7280';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}25`, borderColor: `${statusColor}60` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{event.status.replace('_', ' ')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Event Info */}
        <View style={styles.section}>
          <Text style={styles.eventCode}>{event.code}</Text>
          <Text style={styles.eventName}>{event.name}</Text>
          {event.clientName && <Text style={styles.client}>Client: {event.clientName}</Text>}

          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📍</Text>
            <Text style={styles.detailText}>{event.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{formatDateTime(event.startAt)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕕</Text>
            <Text style={styles.detailText}>{formatDateTime(event.endAt)}</Text>
          </View>
          {event.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}
        </View>

        {/* My Assignment */}
        {myAssignment && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Assignment</Text>
            <View style={styles.assignmentCard}>
              <DetailRow label="Role" value={myAssignment.roleInEvent} />
              <DetailRow label="Job Status" value={myAssignment.jobStatus.replace('_', ' ')} />
              <DetailRow label="Start" value={formatDateTime(myAssignment.startAt)} />
              <DetailRow label="End" value={formatDateTime(myAssignment.endAt)} />
              {myAssignment.notes && <DetailRow label="Notes" value={myAssignment.notes} />}
            </View>

            {/* Update Status Buttons */}
            {!['COMPLETED', 'CANCELLED'].includes(event.status) && (
              <View style={styles.statusButtons}>
                <Text style={styles.statusLabel}>Update Job Status:</Text>
                <View style={styles.btnRow}>
                  {JOB_STATUSES.filter((s) => s !== myAssignment.jobStatus).map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, updating && styles.btnDisabled]}
                      onPress={() => void updateJobStatus(s)}
                      disabled={updating}
                    >
                      <Text style={styles.statusBtnText}>{s.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Equipment */}
        {event.allocations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment ({event.allocations.length})</Text>
            {event.allocations.map((a) => (
              <View key={a.id} style={styles.equipRow}>
                <Text style={styles.equipName}>{a.equipment?.name ?? a.equipmentId}</Text>
                <Text style={styles.equipQty}>×{a.quantity}</Text>
              </View>
            ))}
          </View>
        )}

        {/* All Crew */}
        {event.assignments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Crew Team ({event.assignments.length})</Text>
            {event.assignments.map((a) => (
              <View key={a.id} style={[styles.crewRow, a.id === assignmentId && styles.crewRowMe]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(a.crewProfile?.user.fullName ?? 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.crewName}>
                    {a.crewProfile?.user.fullName ?? '—'}
                    {a.id === assignmentId ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.crewRole}>{a.roleInEvent}</Text>
                </View>
                <Text style={styles.crewStatus}>{a.jobStatus.replace('_', ' ')}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRowInner}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.bg },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 16, fontFamily: FONTS.regular },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: COLORS.accent, fontSize: 15, fontFamily: FONTS.medium },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },

  scroll: { padding: 16, gap: 16 },

  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  eventCode: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular, letterSpacing: 0.5 },
  eventName: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', fontFamily: FONTS.bold },
  client: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.regular },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailIcon: { fontSize: 14 },
  detailText: { color: COLORS.textSecondary, fontSize: 13, flex: 1, fontFamily: FONTS.regular },
  notesBox: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  notesText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: FONTS.regular },

  assignmentCard: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  detailRowInner: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  detailLabel: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.regular, flex: 1 },
  detailValue: { color: COLORS.textPrimary, fontSize: 13, fontFamily: FONTS.medium, flex: 2, textAlign: 'right' },

  statusButtons: { marginTop: 4 },
  statusLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 8, fontFamily: FONTS.regular },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusBtn: {
    backgroundColor: `${COLORS.accent}20`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.accent}60`,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  btnDisabled: { opacity: 0.4 },
  statusBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: '600', fontFamily: FONTS.medium },

  equipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  equipName: { color: COLORS.textPrimary, fontSize: 13, fontFamily: FONTS.regular, flex: 1 },
  equipQty: { color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.medium },

  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  crewRowMe: {
    backgroundColor: `${COLORS.accent}12`,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginHorizontal: -8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${COLORS.accent}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.accent, fontSize: 14, fontWeight: '700', fontFamily: FONTS.bold },
  crewName: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '500', fontFamily: FONTS.medium },
  crewRole: { color: COLORS.textMuted, fontSize: 11, fontFamily: FONTS.regular },
  crewStatus: { color: COLORS.textSecondary, fontSize: 11, fontFamily: FONTS.regular },
});
