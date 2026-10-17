// Shared utility functions and components used across dashboard pages

// ─── Date formatting ───────────────────────────────────────────────────────────
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateStr = s.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStart = s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const timeEnd = e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} · ${timeStart} – ${timeEnd}`;
}

// ─── Status Badge component ────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT:       { bg: '#e8f0ff', text: '#2961e0', label: 'Draft' },
  CONFIRMED:   { bg: '#f0ebff', text: '#6647b8', label: 'Confirmed' },
  IN_PROGRESS: { bg: '#e0f7eb', text: '#148c5c', label: 'Berlangsung' },
  COMPLETED:   { bg: '#e0f7eb', text: '#148c5c', label: 'Completed' },
  CANCELLED:   { bg: '#ffe8e8', text: '#bf2e33', label: 'Cancelled' },
  ACTIVE:      { bg: '#e0f7eb', text: '#148c5c', label: 'Active' },
  PENDING:     { bg: '#fef3c7', text: '#b45309', label: 'Pending' },
  GOOD:        { bg: '#e0f7eb', text: '#148c5c', label: 'Good' },
  EXCELLENT:   { bg: '#e8f0ff', text: '#2961e0', label: 'Excellent' },
  NEEDS_REPAIR:{ bg: '#fef3c7', text: '#b45309', label: 'Needs Repair' },
  RETIRED:     { bg: '#f1f5f9', text: '#64748b', label: 'Retired' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { bg: '#f1f5f9', text: '#6e7a8f', label: status };
  return (
    <span
      className="font-medium-face"
      style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 12px', borderRadius: '20px',
        fontSize: '11px', lineHeight: 1,
        background: s.bg, color: s.text,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}
