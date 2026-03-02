import cron from 'node-cron';
import { prisma } from '../lib/prisma';

const MANAGING_PARTNER_THRESHOLD = 50_001;
const DECAY_PER_DAY = 50; // 1 contract's worth of XP

// ─── Logic functions (called by cron scheduler locally, or by HTTP endpoints on Vercel) ──

/**
 * Deducts 50 XP from every Managing Partner who didn't review a contract today.
 * If their XP drops below the threshold, they are demoted to Partner.
 */
export async function runXpDecay(): Promise<{ affected: number; demoted: number }> {
  console.log('[xpDecay] Running Managing Partner decay job...');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const inactive = await prisma.userStats.findMany({
    where: {
      careerTitle: 'Managing Partner',
      OR: [
        { lastActiveDate: null },
        { lastActiveDate: { lt: today } },
      ],
    },
    select: { id: true, userId: true, displayName: true, totalXp: true },
  });

  if (inactive.length === 0) {
    console.log('[xpDecay] No inactive Managing Partners today.');
    return { affected: 0, demoted: 0 };
  }

  let demoted = 0;
  for (const user of inactive) {
    const newXp = Math.max(0, user.totalXp - DECAY_PER_DAY);
    const newTitle = newXp < MANAGING_PARTNER_THRESHOLD ? 'Partner' : 'Managing Partner';

    await prisma.userStats.update({
      where: { id: user.id },
      data: { totalXp: newXp, careerTitle: newTitle },
    });

    if (newTitle === 'Partner') {
      demoted++;
      console.log(`[xpDecay] ${user.displayName} demoted to Partner (${newXp} XP)`);
    }
  }

  console.log(`[xpDecay] Decayed ${inactive.length} users, demoted ${demoted} to Partner.`);
  return { affected: inactive.length, demoted };
}

/**
 * Resets weeklyRedlines for all users to 0.
 */
export async function runWeeklyReset(): Promise<void> {
  console.log('[weeklyReset] Resetting weekly redline counts...');
  await prisma.userStats.updateMany({ data: { weeklyRedlines: 0 } });
  console.log('[weeklyReset] Done.');
}

// ─── Cron schedulers (local dev only — Vercel uses HTTP cron endpoints) ──────

/**
 * Runs daily at midnight UTC.
 */
export function registerXpDecayJob(): void {
  cron.schedule('0 0 * * *', async () => {
    try {
      await runXpDecay();
    } catch (err) {
      console.error('[xpDecay] Job failed:', err);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('[xpDecay] Daily XP decay job registered (00:00 UTC).');
}

/**
 * Resets weeklyRedlines every Monday at 00:00 UTC.
 */
export function registerWeeklyLeaderboardReset(): void {
  cron.schedule('0 0 * * 1', async () => {
    try {
      await runWeeklyReset();
    } catch (err) {
      console.error('[weeklyReset] Failed:', err);
    }
  }, {
    timezone: 'UTC',
  });

  console.log('[weeklyReset] Weekly leaderboard reset registered (Mon 00:00 UTC).');
}
