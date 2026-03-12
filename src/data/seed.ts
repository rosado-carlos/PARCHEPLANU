import type {
  ActivityEvent,
  AppDb,
  AttendanceRecord,
  CheckInRecord,
  Parche,
  ParcheMembership,
  Plan,
  PlanOption,
  User,
  Vote,
} from "../types";

const HOUR_MS = 60 * 60 * 1000;
const MIN_PARCHES = 2;
const MIN_USERS = 10;
const MIN_PLANS = 15;
const MIN_VOTES = 30;
const MIN_ATTENDANCES = 40;

function iso(date: Date): string {
  return date.toISOString();
}

function toInviteCode(name: string, id: number): string {
  return `${name.replace(/\s+/g, "-").toUpperCase()}-${id}`;
}

function nextOptionTime(base: Date, offsetHours: number): string {
  return iso(new Date(base.getTime() + offsetHours * HOUR_MS));
}

function computeWinnerOptionId(options: PlanOption[], votes: Vote[]): number {
  const totals = options.map((option) => ({
    option,
    count: votes.filter((vote) => vote.optionId === option.id).length,
  }));

  totals.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const timeDiff = new Date(a.option.time).getTime() - new Date(b.option.time).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.option.ordinal - b.option.ordinal;
  });

  return totals[0].option.id;
}

export function createSeedDb(): AppDb {
  const now = new Date();

  const users: User[] = Array.from({ length: MIN_USERS }, (_, index) => {
    const id = index + 1;
    return {
      id,
      fullName: `Student ${id}`,
      universityEmail: `student${id}@uni.edu`,
      universityIdentifier: `U00${100 + id}`,
      major: id % 2 === 0 ? "Engineering" : "Business",
      avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=student-${id}`,
      password: "1234",
    };
  });

  const parches: Parche[] = [
    {
      id: 1,
      name: "Parche Andes",
      description: "Planes de fin de semana para el campus central.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=60",
      inviteCode: toInviteCode("Parche Andes", 1),
      ownerUserId: 1,
      createdAt: iso(new Date(now.getTime() - 40 * HOUR_MS)),
    },
    {
      id: 2,
      name: "Parche Nocturno",
      description: "Parches nocturnos y salidas de mitad de semana.",
      coverImageUrl:
        "https://images.unsplash.com/photo-1521334884684-d80222895322?auto=format&fit=crop&w=1200&q=60",
      inviteCode: toInviteCode("Parche Nocturno", 2),
      ownerUserId: 2,
      createdAt: iso(new Date(now.getTime() - 30 * HOUR_MS)),
    },
  ];

  const memberships: ParcheMembership[] = [];
  users.forEach((user) => {
    memberships.push({
      parcheId: 1,
      userId: user.id,
      role: user.id === 1 ? "OWNER" : user.id === 3 ? "MODERATOR" : "MEMBER",
      joinedAt: iso(new Date(now.getTime() - (70 - user.id) * HOUR_MS)),
    });
  });

  users.slice(0, 8).forEach((user) => {
    memberships.push({
      parcheId: 2,
      userId: user.id,
      role: user.id === 2 ? "OWNER" : user.id === 4 ? "MODERATOR" : "MEMBER",
      joinedAt: iso(new Date(now.getTime() - (60 - user.id) * HOUR_MS)),
    });
  });

  const plans: Plan[] = [];
  const options: PlanOption[] = [];
  let optionId = 1;

  for (let id = 1; id <= MIN_PLANS; id += 1) {
    const parcheId = id % 2 === 0 ? 2 : 1;
    const creatorPool = memberships
      .filter((member) => member.parcheId === parcheId)
      .map((member) => member.userId);
    const createdBy = creatorPool[id % creatorPool.length];

    let state: Plan["state"] = "DRAFT";
    if (id >= 4 && id <= 8) state = "VOTING_OPEN";
    if (id >= 9 && id <= 12) state = "VOTING_CLOSED";
    if (id >= 13) state = "SCHEDULED";

    const isHistorical = state === "VOTING_CLOSED" || state === "SCHEDULED";
    const baseDayOffset = isHistorical ? -id : id;

    const dateWindowStart = new Date(now.getTime() + baseDayOffset * 24 * HOUR_MS);
    const dateWindowEnd = new Date(dateWindowStart.getTime() + 4 * HOUR_MS);

    const votingEndAt =
      state === "VOTING_OPEN"
        ? iso(new Date(now.getTime() + 24 * HOUR_MS + id * HOUR_MS))
        : iso(new Date(dateWindowStart.getTime() - 6 * HOUR_MS));

    const plan: Plan = {
      id,
      parcheId,
      createdBy,
      title: `Plan ${id} - ${parcheId === 1 ? "Andes" : "Nocturno"}`,
      description: "Plan colaborativo para votar lugar y hora.",
      dateWindowStart: iso(dateWindowStart),
      dateWindowEnd: iso(dateWindowEnd),
      votingEndAt,
      state,
      winningOptionId: null,
      tieBreakRule: "EARLIEST_OPTION",
      checkInOpenAt: null,
      checkInCloseAt: null,
      createdAt: iso(new Date(dateWindowStart.getTime() - 24 * HOUR_MS)),
    };

    plans.push(plan);

    for (let ordinal = 1; ordinal <= 3; ordinal += 1) {
      options.push({
        id: optionId,
        planId: id,
        place: `Lugar ${ordinal} - Plan ${id}`,
        time: nextOptionTime(dateWindowStart, ordinal),
        ordinal,
      });
      optionId += 1;
    }
  }

  const votes: Vote[] = [];
  for (let idx = 0; idx < MIN_VOTES; idx += 1) {
    const planId = (idx % 10) + 1;
    const plan = plans.find((item) => item.id === planId);
    if (!plan) continue;

    const memberIds = memberships
      .filter((member) => member.parcheId === plan.parcheId)
      .map((member) => member.userId);

    const userId = memberIds[(idx * 3) % memberIds.length];
    const planOptions = options.filter((option) => option.planId === planId);
    const option = planOptions[idx % planOptions.length];

    const exists = votes.some((vote) => vote.planId === planId && vote.userId === userId);
    if (exists) continue;

    votes.push({
      planId,
      userId,
      optionId: option.id,
      updatedAt: iso(new Date(now.getTime() - idx * HOUR_MS)),
    });
  }

  const attendances: AttendanceRecord[] = [];
  for (let idx = 0; idx < MIN_ATTENDANCES; idx += 1) {
    const planId = (idx % 10) + 6;
    const plan = plans.find((item) => item.id === planId);
    if (!plan) continue;

    const memberIds = memberships
      .filter((member) => member.parcheId === plan.parcheId)
      .map((member) => member.userId);

    const userId = memberIds[(idx * 2 + 1) % memberIds.length];
    const exists = attendances.some((item) => item.planId === planId && item.userId === userId);
    if (exists) continue;

    const status: AttendanceRecord["status"] = idx % 3 === 0 ? "YES" : idx % 3 === 1 ? "NO" : "MAYBE";

    attendances.push({
      planId,
      userId,
      status,
      updatedAt: iso(new Date(now.getTime() - idx * 30 * 60 * 1000)),
    });
  }

  let voteCursor = 0;
  while (votes.length < MIN_VOTES) {
    const plan = plans[voteCursor % plans.length];
    const memberIds = memberships
      .filter((member) => member.parcheId === plan.parcheId)
      .map((member) => member.userId);
    const userId = memberIds[Math.floor(voteCursor / plans.length) % memberIds.length];

    const exists = votes.some((vote) => vote.planId === plan.id && vote.userId === userId);
    if (!exists) {
      const planOptions = options.filter((option) => option.planId === plan.id);
      const option = planOptions[voteCursor % planOptions.length];
      votes.push({
        planId: plan.id,
        userId,
        optionId: option.id,
        updatedAt: iso(new Date(now.getTime() - voteCursor * HOUR_MS)),
      });
    }

    voteCursor += 1;
    if (voteCursor > 3000) break;
  }

  let attendanceCursor = 0;
  while (attendances.length < MIN_ATTENDANCES) {
    const plan = plans[attendanceCursor % plans.length];
    const memberIds = memberships
      .filter((member) => member.parcheId === plan.parcheId)
      .map((member) => member.userId);
    const userId = memberIds[Math.floor(attendanceCursor / plans.length) % memberIds.length];

    const exists = attendances.some((item) => item.planId === plan.id && item.userId === userId);
    if (!exists) {
      const status: AttendanceRecord["status"] =
        attendanceCursor % 3 === 0 ? "YES" : attendanceCursor % 3 === 1 ? "NO" : "MAYBE";

      attendances.push({
        planId: plan.id,
        userId,
        status,
        updatedAt: iso(new Date(now.getTime() - attendanceCursor * 45 * 60 * 1000)),
      });
    }

    attendanceCursor += 1;
    if (attendanceCursor > 3000) break;
  }

  plans.forEach((plan) => {
    if (plan.state === "VOTING_CLOSED" || plan.state === "SCHEDULED") {
      const planOptions = options.filter((option) => option.planId === plan.id);
      const planVotes = votes.filter((vote) => vote.planId === plan.id);
      plan.winningOptionId = computeWinnerOptionId(planOptions, planVotes);
    }

    if (plan.state === "SCHEDULED") {
      const winning = options.find((option) => option.id === plan.winningOptionId);
      if (winning) {
        const winnerTime = new Date(winning.time).getTime();
        plan.checkInOpenAt = iso(new Date(winnerTime - 30 * 60 * 1000));
        plan.checkInCloseAt = iso(new Date(winnerTime + 2 * HOUR_MS));
      }
    }
  });

  const checkIns: CheckInRecord[] = [];
  plans
    .filter((plan) => plan.state === "SCHEDULED")
    .forEach((plan, index) => {
      const memberIds = memberships
        .filter((member) => member.parcheId === plan.parcheId)
        .map((member) => member.userId);

      memberIds.slice(0, 3).forEach((userId, memberIndex) => {
        if ((index + memberIndex) % 2 === 0) {
          checkIns.push({
            planId: plan.id,
            userId,
            checkedInAt: iso(new Date(now.getTime() - (index + memberIndex + 3) * HOUR_MS)),
          });
        }
      });
    });

  const activities: ActivityEvent[] = [];
  let activityId = 1;

  parches.forEach((parche) => {
    activities.push({
      id: activityId,
      parcheId: parche.id,
      userId: parche.ownerUserId,
      eventType: "PARCHE_CREATED",
      entityType: "PARCHE",
      entityId: parche.id,
      createdAt: parche.createdAt,
      metadata: parche.name,
    });
    activityId += 1;
  });

  plans.forEach((plan) => {
    activities.push({
      id: activityId,
      parcheId: plan.parcheId,
      userId: plan.createdBy,
      eventType: "PLAN_CREATED",
      entityType: "PLAN",
      entityId: plan.id,
      createdAt: plan.createdAt,
      metadata: plan.title,
    });
    activityId += 1;
  });

  if (parches.length < MIN_PARCHES || users.length < MIN_USERS || plans.length < MIN_PLANS) {
    throw new Error("Seed base data does not meet minimum requirements");
  }

  if (votes.length < MIN_VOTES || attendances.length < MIN_ATTENDANCES) {
    throw new Error("Seed activity data does not meet minimum requirements");
  }

  return {
    users,
    parches,
    memberships,
    plans,
    options,
    votes,
    attendances,
    checkIns,
    activities,
  };
}

