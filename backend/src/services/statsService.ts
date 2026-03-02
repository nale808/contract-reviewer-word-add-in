import { prisma } from '../lib/prisma';
import type { CareerTitle, RiskLevel, StatEvent } from '../types/api';

// ─── Career ladder thresholds ─────────────────────────────────────────────────

const CAREER_THRESHOLDS: { title: CareerTitle; minXp: number }[] = [
  { title: 'Managing Partner', minXp: 50_001 },
  { title: 'Partner', minXp: 20_001 },
  { title: 'Senior Associate', minXp: 8_001 },
  { title: 'Junior Associate', minXp: 2_501 },
  { title: 'Paralegal', minXp: 0 },
];

// ─── XP values per event ──────────────────────────────────────────────────────

const BASE_XP: Record<StatEvent, number> = {
  contractAnalyzed: 25,
  redlineInserted: 0, // depends on risk level — calculated below
  contractCompleted: 50,
  playbookCompared: 20,
};

const REDLINE_XP: Record<RiskLevel, number> = {
  HIGH: 15,
  MEDIUM: 10,
  LOW: 5,
  NONE: 2,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function titleForXp(xp: number): CareerTitle {
  for (const tier of CAREER_THRESHOLDS) {
    if (xp >= tier.minXp) return tier.title;
  }
  return 'Paralegal';
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isYesterday(date: Date): boolean {
  const yesterday = todayUtc();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return date.getTime() === yesterday.getTime();
}

function isToday(date: Date): boolean {
  return date.getTime() === todayUtc().getTime();
}

// ─── Core stat recording ──────────────────────────────────────────────────────

export interface RecordStatResult {
  totalXp: number;
  careerTitle: CareerTitle;
  currentStreak: number;
  leveledUp: boolean;
  previousTitle?: CareerTitle;
}

export async function recordStat(
  userId: string,
  displayName: string,
  event: StatEvent,
  payload?: {
    riskLevel?: RiskLevel;
    scoreImprovement?: number;
    xpMultiplier?: number;
  }
): Promise<RecordStatResult> {
  const today = todayUtc();
  const multiplier = payload?.xpMultiplier ?? 1;

  // Calculate XP for this event
  let earnedXp: number;
  if (event === 'redlineInserted') {
    earnedXp = Math.round((REDLINE_XP[payload?.riskLevel ?? 'LOW']) * multiplier);
  } else {
    earnedXp = Math.round(BASE_XP[event] * multiplier);
  }

  // Bonus XP for completions at 100 score
  if (event === 'contractCompleted' && (payload?.scoreImprovement ?? 0) >= 90) {
    earnedXp += 50; // bonus for reaching 100 health score
  }

  // Upsert user record
  try {
    const existing = await prisma.userStats.findUnique({ where: { userId } });
    const previousTitle = (existing?.careerTitle as CareerTitle | undefined) ?? 'Paralegal';

    const newXp = (existing?.totalXp ?? 0) + earnedXp;
    const newTitle = titleForXp(newXp);

    // Streak logic
    let newStreak = existing?.currentStreak ?? 0;
    let newLongest = existing?.longestStreak ?? 0;

    if (event === 'contractAnalyzed') {
      const last = existing?.lastActiveDate ? new Date(existing.lastActiveDate) : null;
      if (!last) {
        newStreak = 1;
      } else if (isToday(last)) {
        // Already reviewed today — no change
      } else if (isYesterday(last)) {
        newStreak += 1;
      } else {
        newStreak = 1; // streak broken
      }
      newLongest = Math.max(newLongest, newStreak);
    }

    // Streak XP bonuses
    let streakBonus = 0;
    if (event === 'contractAnalyzed') {
      if (newStreak === 3) streakBonus = 25;
      else if (newStreak === 7) streakBonus = 75;
      else if (newStreak === 30) streakBonus = 300;
    }
    const finalXp = newXp + streakBonus;
    const finalTitle = titleForXp(finalXp);

    const updated = await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        displayName,
        totalXp: finalXp,
        careerTitle: finalTitle,
        contractsReviewed: event === 'contractAnalyzed' ? 1 : 0,
        redlinesInserted: event === 'redlineInserted' ? 1 : 0,
        weeklyRedlines: event === 'redlineInserted' ? 1 : 0,
        totalScoreImprovement: payload?.scoreImprovement ?? 0,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: event === 'contractAnalyzed' ? today : undefined,
      },
      update: {
        displayName, // keep display name fresh
        totalXp: finalXp,
        careerTitle: finalTitle,
        contractsReviewed: event === 'contractAnalyzed' ? { increment: 1 } : undefined,
        redlinesInserted: event === 'redlineInserted' ? { increment: 1 } : undefined,
        weeklyRedlines: event === 'redlineInserted' ? { increment: 1 } : undefined,
        totalScoreImprovement:
          payload?.scoreImprovement
            ? { increment: payload.scoreImprovement }
            : undefined,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: event === 'contractAnalyzed' ? today : undefined,
      },
    });

    return {
      totalXp: updated.totalXp,
      careerTitle: updated.careerTitle as CareerTitle,
      currentStreak: updated.currentStreak,
      leveledUp: finalTitle !== previousTitle,
      previousTitle: finalTitle !== previousTitle ? previousTitle : undefined,
    };
  } catch (error) {
    console.error('[statsService] Database error:', error instanceof Error ? error.message : error);
    throw new Error('Database operation failed');
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(requestingUserId: string) {
  try {
    const top20 = await prisma.userStats.findMany({
      orderBy: { weeklyRedlines: 'desc' },
      take: 20,
      select: {
        userId: true,
        displayName: true,
        weeklyRedlines: true,
        contractsReviewed: true,
        careerTitle: true,
      },
    });

    const entries = top20.map((u, i) => ({
      rank: i + 1,
      displayName: u.displayName,
      weeklyRedlines: u.weeklyRedlines,
      contractsReviewed: u.contractsReviewed,
      careerTitle: u.careerTitle as CareerTitle,
    }));

    const myIndex = top20.findIndex((u) => u.userId === requestingUserId);

    // If user not in top 20, fetch their actual rank
    let myRank: number | null = myIndex >= 0 ? myIndex + 1 : null;
    if (myRank === null) {
      const myStats = await prisma.userStats.findUnique({ where: { userId: requestingUserId } });
      if (myStats) {
        const ahead = await prisma.userStats.count({
          where: { weeklyRedlines: { gt: myStats.weeklyRedlines } },
        });
        myRank = ahead + 1;
      }
    }

    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay() + 1); // Monday
    const week = weekStart.toISOString().slice(0, 10);

    return { week, entries, myRank };
  } catch (error) {
    console.error('[statsService] Database error:', error instanceof Error ? error.message : error);
    throw new Error('Database operation failed');
  }
}

