import { AllocationStatus, AssignmentStatus, EventStatus, PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/** Jakarta (UTC+7) local civil time to UTC Date. */
function wib(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour - 7, minute, 0, 0));
}

async function main(): Promise<void> {
  console.log('Seeding development data (DEMO — not for production)');

  await prisma.idempotencyKey.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.crewAssignment.deleteMany();
  await prisma.equipmentAllocation.deleteMany();
  await prisma.eventStatusHistory.deleteMany();
  await prisma.event.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.equipmentCategory.deleteMany();
  await prisma.crewProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await argon2.hash('DemoPass123!', {
    type: argon2.argon2id,
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@epms.local',
      passwordHash,
      fullName: 'Ayu Prasetyo',
      role: 'ADMIN',
    },
  });

  const [soundTech, lightingTech, stageManager] = await Promise.all([
    prisma.user.create({
      data: {
        email: 'budi.sound@epms.local',
        passwordHash,
        fullName: 'Budi Santoso',
        role: 'CREW',
        crewProfile: {
          create: {
            phone: '+62-811-0000-1001',
            skills: 'audio,foh,wireless-mic',
            notes: 'Lead audio technician',
          },
        },
      },
      include: { crewProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'citra.light@epms.local',
        passwordHash,
        fullName: 'Citra Lestari',
        role: 'CREW',
        crewProfile: {
          create: {
            phone: '+62-811-0000-1002',
            skills: 'lighting,console,rigging',
            notes: 'Lighting director',
          },
        },
      },
      include: { crewProfile: true },
    }),
    prisma.user.create({
      data: {
        email: 'dewa.stage@epms.local',
        passwordHash,
        fullName: 'Dewa Mahendra',
        role: 'CREW',
        crewProfile: {
          create: {
            phone: '+62-811-0000-1003',
            skills: 'stage,truss,safety',
            notes: 'Stage manager',
          },
        },
      },
      include: { crewProfile: true },
    }),
  ]);

  const [audioCat, lightingCat, videoCat, stageCat] = await Promise.all([
    prisma.equipmentCategory.create({
      data: { code: 'AUDIO', name: 'Audio', description: 'Speakers, mixers, microphones' },
    }),
    prisma.equipmentCategory.create({
      data: { code: 'LIGHTING', name: 'Lighting', description: 'LED pars, moving heads, consoles' },
    }),
    prisma.equipmentCategory.create({
      data: { code: 'VIDEO', name: 'Video', description: 'Cameras, switchers, LED wall' },
    }),
    prisma.equipmentCategory.create({
      data: { code: 'STAGE', name: 'Stage', description: 'Truss, platforms, barriers' },
    }),
  ]);

  const [speakers, mixer, ledPars, cameras, truss] = await Promise.all([
    prisma.equipment.create({
      data: {
        categoryId: audioCat.id,
        code: 'AUD-SPK-001',
        name: 'Line array speaker (pair-unit)',
        quantityOnHand: 8,
        usableQuantity: 8,
        condition: 'GOOD',
        storageLocation: 'Gudang A / Rak Audio',
      },
    }),
    prisma.equipment.create({
      data: {
        categoryId: audioCat.id,
        code: 'AUD-MIX-001',
        name: 'Digital mixer 32 channel',
        quantityOnHand: 2,
        usableQuantity: 2,
        condition: 'EXCELLENT',
        storageLocation: 'Gudang A / Case Mixer',
      },
    }),
    prisma.equipment.create({
      data: {
        categoryId: lightingCat.id,
        code: 'LGT-PAR-001',
        name: 'LED PAR 18x18',
        quantityOnHand: 24,
        usableQuantity: 20,
        condition: 'GOOD',
        storageLocation: 'Gudang B / Lighting',
        notes: '4 units marked unusable and excluded from usable_quantity',
      },
    }),
    prisma.equipment.create({
      data: {
        categoryId: videoCat.id,
        code: 'VID-CAM-001',
        name: 'Cinema camera body',
        quantityOnHand: 4,
        usableQuantity: 4,
        condition: 'EXCELLENT',
        storageLocation: 'Gudang A / Video Safe',
      },
    }),
    prisma.equipment.create({
      data: {
        categoryId: stageCat.id,
        code: 'STG-TRS-001',
        name: 'Box truss 2m',
        quantityOnHand: 16,
        usableQuantity: 16,
        condition: 'GOOD',
        storageLocation: 'Yard / Stage',
      },
    }),
  ]);

  const morningStart = wib(2026, 10, 20, 9);
  const morningEnd = wib(2026, 10, 20, 12);
  const afternoonStart = wib(2026, 10, 20, 12);
  const afternoonEnd = wib(2026, 10, 20, 16);
  const galaStart = wib(2026, 10, 24, 17);
  const galaEnd = wib(2026, 10, 24, 23);
  const pastStart = wib(2026, 10, 8, 8);
  const pastEnd = wib(2026, 10, 8, 18);
  const draftStart = wib(2026, 11, 2, 10);
  const draftEnd = wib(2026, 11, 2, 15);

  const morningBriefing = await prisma.event.create({
    data: {
      code: 'EVT-2026-001',
      name: 'Morning product briefing',
      clientName: 'PT Nusantara Retail',
      location: 'Ballroom 1, Hotel Merdeka, Jakarta',
      timezone: 'Asia/Jakarta',
      startAt: morningStart,
      endAt: morningEnd,
      status: EventStatus.CONFIRMED,
      notes: 'Back-to-back with afternoon town hall; same speakers must free at 12:00.',
      createdById: admin.id,
      responsibleUserId: admin.id,
    },
  });

  const afternoonTownHall = await prisma.event.create({
    data: {
      code: 'EVT-2026-002',
      name: 'Afternoon town hall',
      clientName: 'PT Nusantara Retail',
      location: 'Ballroom 1, Hotel Merdeka, Jakarta',
      timezone: 'Asia/Jakarta',
      startAt: afternoonStart,
      endAt: afternoonEnd,
      status: EventStatus.CONFIRMED,
      notes: 'Starts exactly when morning briefing ends — must not be treated as overlap.',
      createdById: admin.id,
      responsibleUserId: admin.id,
    },
  });

  const gala = await prisma.event.create({
    data: {
      code: 'EVT-2026-003',
      name: 'Corporate gala dinner',
      clientName: 'Bank Sejahtera',
      location: 'Grand Ballroom, City Convention Center',
      timezone: 'Asia/Jakarta',
      startAt: galaStart,
      endAt: galaEnd,
      status: EventStatus.CONFIRMED,
      createdById: admin.id,
      responsibleUserId: admin.id,
    },
  });

  const completedLaunch = await prisma.event.create({
    data: {
      code: 'EVT-2026-000',
      name: 'Completed brand launch (historical)',
      clientName: 'Kopi Senja',
      location: 'Outdoor plaza, Bandung',
      timezone: 'Asia/Jakarta',
      startAt: pastStart,
      endAt: pastEnd,
      status: EventStatus.COMPLETED,
      createdById: admin.id,
      responsibleUserId: admin.id,
    },
  });

  const draftWorkshop = await prisma.event.create({
    data: {
      code: 'EVT-2026-004',
      name: 'Draft workshop (does not hold stock)',
      clientName: 'Internal',
      location: 'Studio Kantor Pusat',
      timezone: 'Asia/Jakarta',
      startAt: draftStart,
      endAt: draftEnd,
      status: EventStatus.DRAFT,
      createdById: admin.id,
      responsibleUserId: admin.id,
    },
  });

  const historyRows = [
    { eventId: morningBriefing.id, toStatus: EventStatus.CONFIRMED },
    { eventId: afternoonTownHall.id, toStatus: EventStatus.CONFIRMED },
    { eventId: gala.id, toStatus: EventStatus.CONFIRMED },
    { eventId: completedLaunch.id, toStatus: EventStatus.COMPLETED, fromStatus: EventStatus.IN_PROGRESS },
    { eventId: draftWorkshop.id, toStatus: EventStatus.DRAFT },
  ] as const;

  for (const row of historyRows) {
    await prisma.eventStatusHistory.create({
      data: {
        eventId: row.eventId,
        fromStatus: 'fromStatus' in row ? row.fromStatus : null,
        toStatus: row.toStatus,
        changedById: admin.id,
        reason: 'Development seed',
      },
    });
  }

  await prisma.equipmentAllocation.createMany({
    data: [
      {
        eventId: morningBriefing.id,
        equipmentId: speakers.id,
        quantity: 4,
        status: AllocationStatus.ACTIVE,
        startAt: morningStart,
        endAt: morningEnd,
      },
      {
        eventId: afternoonTownHall.id,
        equipmentId: speakers.id,
        quantity: 4,
        status: AllocationStatus.ACTIVE,
        startAt: afternoonStart,
        endAt: afternoonEnd,
      },
      {
        eventId: gala.id,
        equipmentId: speakers.id,
        quantity: 6,
        status: AllocationStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
      {
        eventId: gala.id,
        equipmentId: ledPars.id,
        quantity: 12,
        status: AllocationStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
      {
        eventId: gala.id,
        equipmentId: mixer.id,
        quantity: 1,
        status: AllocationStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
      {
        eventId: gala.id,
        equipmentId: truss.id,
        quantity: 8,
        status: AllocationStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
      {
        eventId: draftWorkshop.id,
        equipmentId: cameras.id,
        quantity: 2,
        status: AllocationStatus.PENDING,
        startAt: draftStart,
        endAt: draftEnd,
        notes: 'PENDING on DRAFT event — must not reduce available stock.',
      },
    ],
  });

  const budi = soundTech.crewProfile;
  const citra = lightingTech.crewProfile;
  const dewa = stageManager.crewProfile;
  if (!budi || !citra || !dewa) {
    throw new Error('Crew profiles were not created');
  }

  await prisma.crewAssignment.createMany({
    data: [
      {
        eventId: morningBriefing.id,
        crewProfileId: budi.id,
        roleInEvent: 'FOH engineer',
        status: AssignmentStatus.ACTIVE,
        startAt: morningStart,
        endAt: morningEnd,
      },
      {
        eventId: afternoonTownHall.id,
        crewProfileId: budi.id,
        roleInEvent: 'FOH engineer',
        status: AssignmentStatus.ACTIVE,
        startAt: afternoonStart,
        endAt: afternoonEnd,
      },
      {
        eventId: gala.id,
        crewProfileId: citra.id,
        roleInEvent: 'Lighting director',
        status: AssignmentStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
      {
        eventId: gala.id,
        crewProfileId: dewa.id,
        roleInEvent: 'Stage manager',
        status: AssignmentStatus.ACTIVE,
        startAt: galaStart,
        endAt: galaEnd,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: 'SEED_DEVELOPMENT',
      entityType: 'system',
      result: 'SUCCESS',
      reason: 'Development seed completed. Credentials are demo-only.',
    },
  });

  console.log('Seed complete.');
  console.log('DEMO accounts (development only):');
  console.log('  ADMIN  admin@epms.local        DemoPass123!');
  console.log('  CREW   budi.sound@epms.local   DemoPass123!');
  console.log('  CREW   citra.light@epms.local  DemoPass123!');
  console.log('  CREW   dewa.stage@epms.local   DemoPass123!');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
