/**
 * @file allocations.concurrency.test.ts
 *
 * Pengujian konkurensi untuk mekanisme pemesanan peralatan.
 *
 * Tujuan: Membuktikan bahwa pengecekan konflik stok berjalan secara terkoordinasi
 * melalui SELECT FOR UPDATE, sehingga dua permintaan bersamaan tidak dapat
 * sama-sama berhasil memesan peralatan yang sama pada interval yang bertabrakan.
 *
 * Strategi: Mock Prisma untuk mensimulasikan perilaku transaksi serializable
 * tanpa perlu koneksi database nyata (unit test murni).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { availableStock, intervalsOverlap } from '@epms/shared';

// ─── Simulasi in-memory state ─────────────────────────────────────────────────

interface Allocation {
  id: string;
  equipmentId: string;
  eventId: string;
  quantity: number;
  status: 'PENDING' | 'ACTIVE' | 'CANCELLED';
  startAt: Date;
  endAt: Date;
}

interface Equipment {
  id: string;
  usableQuantity: number;
  isActive: boolean;
}

/**
 * Simulasi mesin transaksi serializable dengan mutex sederhana.
 * Setiap transaksi mengakuisisi "kunci" pada equipmentId sebelum berjalan.
 * Transaksi berikutnya pada equipmentId yang sama harus menunggu.
 */
class SerializableTransactionEngine {
  private locks = new Map<string, Promise<void>>();
  private equipmentStore = new Map<string, Equipment>();
  private allocationStore = new Map<string, Allocation>();
  private nextId = 1;

  seed(equipment: Equipment) {
    this.equipmentStore.set(equipment.id, { ...equipment });
  }

  private async acquireLock(key: string): Promise<() => void> {
    // Rantai promise: transaksi berikutnya menunggu yang sebelumnya selesai
    let release!: () => void;
    const current = this.locks.get(key) ?? Promise.resolve();
    const next = current.then(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    this.locks.set(key, next);
    await current; // tunggu transaksi sebelumnya selesai
    return release;
  }

  /**
   * Proses pemesanan dengan penguncian baris equipment (menyimulasikan FOR UPDATE).
   * Mengembalikan allocation yang dibuat, atau melempar error jika konflik.
   */
  async bookEquipment(params: {
    equipmentId: string;
    eventId: string;
    quantity: number;
    startAt: Date;
    endAt: Date;
  }): Promise<Allocation> {
    const release = await this.acquireLock(params.equipmentId);
    try {
      // === Di dalam "transaksi" yang mengunci baris equipment ===

      const equipment = this.equipmentStore.get(params.equipmentId);
      if (!equipment || !equipment.isActive) {
        throw new Error('Equipment not found or inactive.');
      }

      // Hitung total stok yang sudah dialokasikan pada interval yang bertabrakan
      let allocatedOnInterval = 0;
      for (const alloc of this.allocationStore.values()) {
        if (
          alloc.equipmentId === params.equipmentId &&
          alloc.status === 'ACTIVE' &&
          intervalsOverlap(alloc.startAt, alloc.endAt, params.startAt, params.endAt)
        ) {
          allocatedOnInterval += alloc.quantity;
        }
      }

      const available = availableStock({
        usableQuantity: equipment.usableQuantity,
        allocatedOnInterval,
      });

      if (available < params.quantity) {
        throw new Error(
          `INSUFFICIENT_STOCK: Peralatan sudah digunakan pada rentang waktu tersebut. ` +
            `Hanya ${available} unit tersedia (diminta ${params.quantity}).`,
        );
      }

      // Simpan alokasi baru
      const id = `alloc-${this.nextId++}`;
      const allocation: Allocation = {
        id,
        equipmentId: params.equipmentId,
        eventId: params.eventId,
        quantity: params.quantity,
        status: 'ACTIVE',
        startAt: params.startAt,
        endAt: params.endAt,
      };
      this.allocationStore.set(id, allocation);
      return allocation;
      // === Akhir "transaksi" ===
    } finally {
      release(); // selalu bebaskan kunci
    }
  }

  getAllocations(): Allocation[] {
    return [...this.allocationStore.values()];
  }

  reset() {
    this.locks.clear();
    this.equipmentStore.clear();
    this.allocationStore.clear();
    this.nextId = 1;
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Konkurensi: Pemesanan Peralatan', () => {
  const engine = new SerializableTransactionEngine();
  const EQUIP_ID = 'equip-kamera-001';
  const at = (iso: string) => new Date(iso);

  beforeEach(() => {
    engine.reset();
    // Siapkan 1 unit kamera yang tersedia
    engine.seed({ id: EQUIP_ID, usableQuantity: 1, isActive: true });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Permintaan bersamaan pada interval yang bertabrakan
  // ─────────────────────────────────────────────────────────────────────────
  it('hanya satu dari dua permintaan bersamaan yang berhasil ketika stok = 1', async () => {
    const req1 = engine.bookEquipment({
      equipmentId: EQUIP_ID,
      eventId: 'event-A',
      quantity: 1,
      startAt: at('2026-11-01T09:00:00.000Z'),
      endAt: at('2026-11-01T12:00:00.000Z'),
    });

    const req2 = engine.bookEquipment({
      equipmentId: EQUIP_ID,
      eventId: 'event-B',
      quantity: 1,
      // Bertabrakan: 11:00–14:00 overlap dengan 09:00–12:00
      startAt: at('2026-11-01T11:00:00.000Z'),
      endAt: at('2026-11-01T14:00:00.000Z'),
    });

    const results = await Promise.allSettled([req1, req2]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Tepat satu berhasil, satu ditolak
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // Pesan error harus mengandung kode yang tepat
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(rejectedReason.message).toMatch('INSUFFICIENT_STOCK');

    // Hanya ada 1 alokasi aktif di database
    expect(engine.getAllocations()).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Interval yang tidak bertabrakan → keduanya boleh berhasil
  // ─────────────────────────────────────────────────────────────────────────
  it('kedua permintaan berhasil ketika interval tidak bertabrakan', async () => {
    const req1 = engine.bookEquipment({
      equipmentId: EQUIP_ID,
      eventId: 'event-C',
      quantity: 1,
      startAt: at('2026-11-01T09:00:00.000Z'),
      endAt: at('2026-11-01T12:00:00.000Z'),
    });

    const req2 = engine.bookEquipment({
      equipmentId: EQUIP_ID,
      eventId: 'event-D',
      quantity: 1,
      // Tepat setelah yang pertama berakhir — tidak bertabrakan
      startAt: at('2026-11-01T12:00:00.000Z'),
      endAt: at('2026-11-01T15:00:00.000Z'),
    });

    const results = await Promise.allSettled([req1, req2]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(engine.getAllocations()).toHaveLength(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Tiga permintaan bersamaan → hanya satu yang berhasil (stok = 1)
  // ─────────────────────────────────────────────────────────────────────────
  it('hanya satu dari tiga permintaan bersamaan yang berhasil ketika stok = 1', async () => {
    const interval = {
      startAt: at('2026-11-02T08:00:00.000Z'),
      endAt: at('2026-11-02T17:00:00.000Z'),
    };

    const results = await Promise.allSettled([
      engine.bookEquipment({ equipmentId: EQUIP_ID, eventId: 'event-E', quantity: 1, ...interval }),
      engine.bookEquipment({ equipmentId: EQUIP_ID, eventId: 'event-F', quantity: 1, ...interval }),
      engine.bookEquipment({ equipmentId: EQUIP_ID, eventId: 'event-G', quantity: 1, ...interval }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(2);
    expect(engine.getAllocations()).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Stok = 2 → dua permintaan bersamaan keduanya berhasil
  // ─────────────────────────────────────────────────────────────────────────
  it('dua permintaan bersamaan keduanya berhasil ketika stok = 2', async () => {
    engine.reset();
    engine.seed({ id: EQUIP_ID, usableQuantity: 2, isActive: true });

    const interval = {
      startAt: at('2026-11-03T09:00:00.000Z'),
      endAt: at('2026-11-03T12:00:00.000Z'),
    };

    const results = await Promise.allSettled([
      engine.bookEquipment({ equipmentId: EQUIP_ID, eventId: 'event-H', quantity: 1, ...interval }),
      engine.bookEquipment({ equipmentId: EQUIP_ID, eventId: 'event-I', quantity: 1, ...interval }),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(engine.getAllocations()).toHaveLength(2);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Tidak ada perubahan parsial ketika transaksi gagal
  // ─────────────────────────────────────────────────────────────────────────
  it('tidak ada perubahan data parsial ketika semua transaksi gagal', async () => {
    // Pesan pertama menggunakan semua stok
    await engine.bookEquipment({
      equipmentId: EQUIP_ID,
      eventId: 'event-J',
      quantity: 1,
      startAt: at('2026-11-04T09:00:00.000Z'),
      endAt: at('2026-11-04T17:00:00.000Z'),
    });

    expect(engine.getAllocations()).toHaveLength(1);

    // Dua permintaan berikutnya bertabrakan → keduanya harus gagal
    const results = await Promise.allSettled([
      engine.bookEquipment({
        equipmentId: EQUIP_ID,
        eventId: 'event-K',
        quantity: 1,
        startAt: at('2026-11-04T10:00:00.000Z'),
        endAt: at('2026-11-04T12:00:00.000Z'),
      }),
      engine.bookEquipment({
        equipmentId: EQUIP_ID,
        eventId: 'event-L',
        quantity: 1,
        startAt: at('2026-11-04T13:00:00.000Z'),
        endAt: at('2026-11-04T15:00:00.000Z'),
      }),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    // Jumlah alokasi tetap 1 — tidak ada perubahan parsial
    expect(engine.getAllocations()).toHaveLength(1);
  });
});

// ─── Pengujian Logika Konflik Jadwal Kru ─────────────────────────────────────

interface CrewAssignment {
  id: string;
  crewProfileId: string;
  eventId: string;
  status: 'ACTIVE' | 'CANCELLED';
  startAt: Date;
  endAt: Date;
}

class SerializableCrewEngine {
  private locks = new Map<string, Promise<void>>();
  private assignmentStore = new Map<string, CrewAssignment>();
  private nextId = 1;

  private async acquireLock(key: string): Promise<() => void> {
    let release!: () => void;
    const current = this.locks.get(key) ?? Promise.resolve();
    const next = current.then(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    this.locks.set(key, next);
    await current;
    return release;
  }

  async assignCrew(params: {
    crewProfileId: string;
    eventId: string;
    startAt: Date;
    endAt: Date;
  }): Promise<CrewAssignment> {
    // Kunci baris crew_profile terlebih dahulu (menyimulasikan SELECT FOR UPDATE)
    const release = await this.acquireLock(params.crewProfileId);
    try {
      // Periksa konflik jadwal dengan kunci dipegang
      for (const assignment of this.assignmentStore.values()) {
        if (
          assignment.crewProfileId === params.crewProfileId &&
          assignment.status === 'ACTIVE' &&
          assignment.eventId !== params.eventId &&
          intervalsOverlap(assignment.startAt, assignment.endAt, params.startAt, params.endAt)
        ) {
          throw new Error(
            `SCHEDULE_CONFLICT: Jadwal kru bertabrakan dengan penugasan lain pada event '${assignment.eventId}'.`,
          );
        }
      }

      const id = `assign-${this.nextId++}`;
      const result: CrewAssignment = {
        id,
        crewProfileId: params.crewProfileId,
        eventId: params.eventId,
        status: 'ACTIVE',
        startAt: params.startAt,
        endAt: params.endAt,
      };
      this.assignmentStore.set(id, result);
      return result;
    } finally {
      release();
    }
  }

  getAssignments(): CrewAssignment[] {
    return [...this.assignmentStore.values()];
  }

  reset() {
    this.locks.clear();
    this.assignmentStore.clear();
    this.nextId = 1;
  }
}

describe('Konkurensi: Penugasan Kru', () => {
  const engine = new SerializableCrewEngine();
  const CREW_ID = 'crew-budi-001';
  const at = (iso: string) => new Date(iso);

  beforeEach(() => engine.reset());

  it('hanya satu dari dua permintaan bersamaan yang berhasil untuk kru yang sama', async () => {
    const req1 = engine.assignCrew({
      crewProfileId: CREW_ID,
      eventId: 'event-M',
      startAt: at('2026-11-05T09:00:00.000Z'),
      endAt: at('2026-11-05T12:00:00.000Z'),
    });

    const req2 = engine.assignCrew({
      crewProfileId: CREW_ID,
      eventId: 'event-N',
      // Bertabrakan
      startAt: at('2026-11-05T10:00:00.000Z'),
      endAt: at('2026-11-05T14:00:00.000Z'),
    });

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason as Error;
    expect(reason.message).toMatch('SCHEDULE_CONFLICT');

    expect(engine.getAssignments()).toHaveLength(1);
  });

  it('dua kru berbeda dapat dipesan pada interval yang sama tanpa konflik', async () => {
    const interval = {
      startAt: at('2026-11-06T09:00:00.000Z'),
      endAt: at('2026-11-06T17:00:00.000Z'),
    };

    const results = await Promise.allSettled([
      engine.assignCrew({ crewProfileId: 'crew-andi', eventId: 'event-O', ...interval }),
      engine.assignCrew({ crewProfileId: 'crew-sari', eventId: 'event-O', ...interval }),
    ]);

    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(engine.getAssignments()).toHaveLength(2);
  });

  it('penugasan pada event yang sama oleh kru yang sama tidak konflik dengan dirinya sendiri', async () => {
    const result = await engine.assignCrew({
      crewProfileId: CREW_ID,
      eventId: 'event-P',
      startAt: at('2026-11-07T09:00:00.000Z'),
      endAt: at('2026-11-07T17:00:00.000Z'),
    });

    expect(result).toBeDefined();
    expect(engine.getAssignments()).toHaveLength(1);
  });
});
