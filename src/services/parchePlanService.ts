import { createSeedDb } from "../data/seed";
import type {
  ActivityEvent,
  AppDb,
  AttendanceStatus,
  Parche,
  ParcheMembership,
  ParcheRole,
  ParcheSummary,
  Plan,
  PlanOption,
  PlanState,
  PlanWithOptions,
  RankingRow,
  User,
  UserProfile,
  VoteResultRow,
} from "../types";

const DB_KEY = "parche_plan_u_db_v1";
const SESSION_KEY = "parche_plan_u_session_v1";

type RegisterInput = {
  fullName: string;
  universityEmail: string;
  universityIdentifier: string;
  major: string;
  avatarUrl?: string;
  password: string;
};

type UpdateProfileInput = {
  fullName: string;
  universityIdentifier: string;
  major: string;
  avatarUrl?: string;
};

type CreateParcheInput = {
  name: string;
  description: string;
  coverImageUrl: string;
};

type CreatePlanInput = {
  title: string;
  description: string;
  dateWindowStart: string;
  dateWindowEnd: string;
  votingEndAt: string;
  options: Array<{ place: string; time: string }>;
};

type MemberView = {
  user: UserProfile;
  role: ParcheRole;
};

type VoteSummary = {
  rows: VoteResultRow[];
  totalVotes: number;
  myVoteOptionId: number | null;
};

type AttendanceView = {
  user: UserProfile;
  status: AttendanceStatus;
  updatedAt: string;
};

type ActivityView = {
  event: ActivityEvent;
  user: UserProfile;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sanitizeUser(user: User): UserProfile {
  return {
    id: user.id,
    fullName: user.fullName,
    universityEmail: user.universityEmail,
    universityIdentifier: user.universityIdentifier,
    major: user.major,
    avatarUrl: user.avatarUrl,
  };
}

function buildInviteCode(name: string, id: number): string {
  return `${name.trim().replace(/\s+/g, "-").toUpperCase()}-${id}`;
}

function nextId(items: Array<{ id: number }>): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((item) => item.id)) + 1;
}

function readDb(): AppDb {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seeded = createSeedDb();
    writeDb(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as AppDb;
    return parsed;
  } catch {
    const seeded = createSeedDb();
    writeDb(seeded);
    return seeded;
  }
}

function writeDb(db: AppDb): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function readSessionUserId(): number | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  const userId = Number(raw);
  return Number.isFinite(userId) ? userId : null;
}

function writeSessionUserId(userId: number | null): void {
  if (userId === null) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }

  localStorage.setItem(SESSION_KEY, String(userId));
}

function findUserById(db: AppDb, userId: number): User {
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error("User not found");
  return user;
}

function ensureMembership(db: AppDb, parcheId: number, userId: number): ParcheMembership {
  const membership = db.memberships.find((item) => item.parcheId === parcheId && item.userId === userId);
  if (!membership) throw new Error("You are not a member of this parche");
  return membership;
}

function ensureParcheRole(
  db: AppDb,
  parcheId: number,
  userId: number,
  roles: ParcheRole[],
): ParcheMembership {
  const membership = ensureMembership(db, parcheId, userId);
  if (!roles.includes(membership.role)) {
    throw new Error("You do not have permission for this action");
  }
  return membership;
}

function nextPlanState(current: PlanState): PlanState | null {
  if (current === "DRAFT") return "VOTING_OPEN";
  if (current === "VOTING_OPEN") return "VOTING_CLOSED";
  if (current === "VOTING_CLOSED") return "SCHEDULED";
  return null;
}

function listPlanOptions(db: AppDb, planId: number): PlanOption[] {
  return db.options
    .filter((option) => option.planId === planId)
    .sort((a, b) => a.ordinal - b.ordinal);
}

function computeWinningOptionId(db: AppDb, planId: number): number {
  const options = listPlanOptions(db, planId);
  if (options.length === 0) throw new Error("Plan has no options");

  const votes = db.votes.filter((vote) => vote.planId === planId);
  const totals = options.map((option) => ({
    option,
    votes: votes.filter((vote) => vote.optionId === option.id).length,
  }));

  totals.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    const timeDiff = new Date(a.option.time).getTime() - new Date(b.option.time).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.option.ordinal - b.option.ordinal;
  });

  return totals[0].option.id;
}

function addActivity(
  db: AppDb,
  parcheId: number,
  userId: number,
  eventType: ActivityEvent["eventType"],
  entityType: ActivityEvent["entityType"],
  entityId: number,
  metadata?: string,
): void {
  db.activities.push({
    id: nextId(db.activities),
    parcheId,
    userId,
    eventType,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
    metadata,
  });
}

function autoCloseExpiredVotingPlans(db: AppDb): boolean {
  let hasChanges = false;
  const now = Date.now();

  db.plans
    .filter((plan) => plan.state === "VOTING_OPEN")
    .forEach((plan) => {
      const votingEndsAt = new Date(plan.votingEndAt).getTime();
      if (now >= votingEndsAt) {
        plan.state = "VOTING_CLOSED";
        plan.winningOptionId = computeWinningOptionId(db, plan.id);
        hasChanges = true;
        addActivity(
          db,
          plan.parcheId,
          plan.createdBy,
          "PLAN_STATE_CHANGED",
          "PLAN",
          plan.id,
          "Voting auto-closed",
        );
      }
    });

  return hasChanges;
}

function withDb<T>(fn: (db: AppDb) => T, persist = true): T {
  const db = readDb();
  const autoClosed = autoCloseExpiredVotingPlans(db);

  try {
    const result = fn(db);
    if (persist || autoClosed) {
      writeDb(db);
    }
    return result;
  } catch (error) {
    if (autoClosed) {
      writeDb(db);
    }
    throw error;
  }
}

function resolvePlanOrThrow(db: AppDb, planId: number): Plan {
  const plan = db.plans.find((item) => item.id === planId);
  if (!plan) throw new Error("Plan not found");
  return plan;
}

function resolveParcheOrThrow(db: AppDb, parcheId: number): Parche {
  const parche = db.parches.find((item) => item.id === parcheId);
  if (!parche) throw new Error("Parche not found");
  return parche;
}

function resolveOptionOrThrow(db: AppDb, optionId: number): PlanOption {
  const option = db.options.find((item) => item.id === optionId);
  if (!option) throw new Error("Option not found");
  return option;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  await delay(80);
  return withDb((db) => {
    const userId = readSessionUserId();
    if (!userId) return null;
    const user = db.users.find((item) => item.id === userId);
    return user ? sanitizeUser(user) : null;
  }, false);
}

export async function getUserProfile(actorId: number): Promise<UserProfile> {
  await delay(80);

  return withDb((db) => {
    const user = findUserById(db, actorId);
    return sanitizeUser(user);
  }, false);
}

export async function updateUserProfile(actorId: number, input: UpdateProfileInput): Promise<UserProfile> {
  await delay(120);

  return withDb((db) => {
    const user = findUserById(db, actorId);
    const normalizedIdentifier = input.universityIdentifier.trim();

    const repeatedIdentifier = db.users.some(
      (item) => item.id !== actorId && item.universityIdentifier === normalizedIdentifier,
    );

    if (repeatedIdentifier) {
      throw new Error("University identifier already in use");
    }

    user.fullName = input.fullName.trim();
    user.universityIdentifier = normalizedIdentifier;
    user.major = input.major.trim();
    user.avatarUrl = input.avatarUrl?.trim() || undefined;

    return sanitizeUser(user);
  });
}

export async function login(universityEmail: string, password: string): Promise<UserProfile> {
  await delay(120);
  return withDb((db) => {
    const normalizedEmail = universityEmail.trim().toLowerCase();
    const user = db.users.find(
      (item) => item.universityEmail.toLowerCase() === normalizedEmail && item.password === password,
    );

    if (!user) throw new Error("Invalid credentials");

    writeSessionUserId(user.id);
    return sanitizeUser(user);
  }, false);
}

export async function logout(): Promise<void> {
  await delay(60);
  writeSessionUserId(null);
}

export async function registerUser(input: RegisterInput): Promise<UserProfile> {
  await delay(120);

  return withDb((db) => {
    const normalizedEmail = input.universityEmail.trim().toLowerCase();
    const emailExists = db.users.some((item) => item.universityEmail.toLowerCase() === normalizedEmail);
    if (emailExists) throw new Error("Email already in use");

    const idExists = db.users.some((item) => item.universityIdentifier === input.universityIdentifier.trim());
    if (idExists) throw new Error("University identifier already in use");

    const user: User = {
      id: nextId(db.users),
      fullName: input.fullName.trim(),
      universityEmail: normalizedEmail,
      universityIdentifier: input.universityIdentifier.trim(),
      major: input.major.trim(),
      avatarUrl: input.avatarUrl?.trim() || undefined,
      password: input.password,
    };

    db.users.push(user);
    writeSessionUserId(user.id);

    return sanitizeUser(user);
  });
}

export async function getUserParches(userId: number): Promise<ParcheSummary[]> {
  await delay(90);

  return withDb((db) => {
    return db.memberships
      .filter((item) => item.userId === userId)
      .map((membership) => {
        const parche = resolveParcheOrThrow(db, membership.parcheId);
        const membersCount = db.memberships.filter((item) => item.parcheId === membership.parcheId).length;
        const plansCount = db.plans.filter((item) => item.parcheId === membership.parcheId).length;

        return {
          parche,
          role: membership.role,
          membersCount,
          plansCount,
        };
      })
      .sort((a, b) => a.parche.name.localeCompare(b.parche.name));
  }, false);
}

export async function createParche(actorId: number, input: CreateParcheInput): Promise<ParcheSummary> {
  await delay(120);

  return withDb((db) => {
    findUserById(db, actorId);

    const parcheId = nextId(db.parches);
    const now = new Date().toISOString();

    const parche: Parche = {
      id: parcheId,
      name: input.name.trim(),
      description: input.description.trim(),
      coverImageUrl: input.coverImageUrl.trim(),
      inviteCode: buildInviteCode(input.name, parcheId),
      ownerUserId: actorId,
      createdAt: now,
    };

    db.parches.push(parche);
    db.memberships.push({
      parcheId: parche.id,
      userId: actorId,
      role: "OWNER",
      joinedAt: now,
    });

    addActivity(db, parche.id, actorId, "PARCHE_CREATED", "PARCHE", parche.id, parche.name);

    return {
      parche,
      role: "OWNER",
      membersCount: 1,
      plansCount: 0,
    };
  });
}

export async function joinParcheByInvite(actorId: number, inviteCodeOrLink: string): Promise<ParcheSummary> {
  await delay(120);

  return withDb((db) => {
    findUserById(db, actorId);

    const invite = inviteCodeOrLink.trim().toUpperCase();
    const normalizedInvite = invite.includes("/") ? invite.split("/").at(-1) ?? invite : invite;

    const parche = db.parches.find((item) => item.inviteCode.toUpperCase() === normalizedInvite);
    if (!parche) throw new Error("Invalid invite code");

    const existing = db.memberships.find((item) => item.parcheId === parche.id && item.userId === actorId);
    if (existing) {
      return {
        parche,
        role: existing.role,
        membersCount: db.memberships.filter((item) => item.parcheId === parche.id).length,
        plansCount: db.plans.filter((item) => item.parcheId === parche.id).length,
      };
    }

    db.memberships.push({
      parcheId: parche.id,
      userId: actorId,
      role: "MEMBER",
      joinedAt: new Date().toISOString(),
    });

    addActivity(db, parche.id, actorId, "MEMBER_JOINED", "PARCHE", parche.id, "Joined by invite");

    return {
      parche,
      role: "MEMBER",
      membersCount: db.memberships.filter((item) => item.parcheId === parche.id).length,
      plansCount: db.plans.filter((item) => item.parcheId === parche.id).length,
    };
  });
}

export function getInviteLink(inviteCode: string): string {
  return `${window.location.origin}/join/${inviteCode}`;
}

export async function getParcheDetails(
  actorId: number,
  parcheId: number,
): Promise<{ parche: Parche; role: ParcheRole }> {
  await delay(80);

  return withDb((db) => {
    const membership = ensureMembership(db, parcheId, actorId);
    return {
      parche: resolveParcheOrThrow(db, parcheId),
      role: membership.role,
    };
  }, false);
}

export async function getParcheMembers(actorId: number, parcheId: number): Promise<MemberView[]> {
  await delay(90);

  return withDb((db) => {
    ensureMembership(db, parcheId, actorId);

    return db.memberships
      .filter((item) => item.parcheId === parcheId)
      .map((membership) => ({
        user: sanitizeUser(findUserById(db, membership.userId)),
        role: membership.role,
      }))
      .sort((a, b) => {
        const rolePriority = (role: ParcheRole): number => {
          if (role === "OWNER") return 0;
          if (role === "MODERATOR") return 1;
          return 2;
        };

        const priorityDiff = rolePriority(a.role) - rolePriority(b.role);
        if (priorityDiff !== 0) return priorityDiff;
        return a.user.fullName.localeCompare(b.user.fullName);
      });
  }, false);
}

export async function updateMemberRole(
  actorId: number,
  parcheId: number,
  targetUserId: number,
  role: ParcheRole,
): Promise<void> {
  await delay(120);

  withDb((db) => {
    ensureParcheRole(db, parcheId, actorId, ["OWNER"]);
    if (role === "OWNER") throw new Error("Owner transfer is not supported in this version");

    const targetMembership = db.memberships.find(
      (item) => item.parcheId === parcheId && item.userId === targetUserId,
    );

    if (!targetMembership) throw new Error("Target member not found");
    if (targetMembership.role === "OWNER") throw new Error("Cannot change owner role");

    targetMembership.role = role;
  });
}

export async function createPlan(
  actorId: number,
  parcheId: number,
  input: CreatePlanInput,
): Promise<PlanWithOptions> {
  await delay(140);

  return withDb((db) => {
    ensureMembership(db, parcheId, actorId);
    if (input.options.length < 3) throw new Error("A plan requires at least 3 options");

    const plan: Plan = {
      id: nextId(db.plans),
      parcheId,
      createdBy: actorId,
      title: input.title.trim(),
      description: input.description.trim(),
      dateWindowStart: input.dateWindowStart,
      dateWindowEnd: input.dateWindowEnd,
      votingEndAt: input.votingEndAt,
      state: "DRAFT",
      winningOptionId: null,
      tieBreakRule: "EARLIEST_OPTION",
      checkInOpenAt: null,
      checkInCloseAt: null,
      createdAt: new Date().toISOString(),
    };

    db.plans.push(plan);

    input.options.forEach((option, index) => {
      db.options.push({
        id: nextId(db.options),
        planId: plan.id,
        place: option.place.trim(),
        time: option.time,
        ordinal: index + 1,
      });
    });

    addActivity(db, parcheId, actorId, "PLAN_CREATED", "PLAN", plan.id, plan.title);

    return {
      plan,
      options: listPlanOptions(db, plan.id),
    };
  });
}

export async function getPlansByParche(actorId: number, parcheId: number): Promise<PlanWithOptions[]> {
  await delay(90);

  return withDb((db) => {
    ensureMembership(db, parcheId, actorId);

    return db.plans
      .filter((plan) => plan.parcheId === parcheId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((plan) => ({
        plan,
        options: listPlanOptions(db, plan.id),
      }));
  }, false);
}

export async function getPlanDetail(
  actorId: number,
  planId: number,
): Promise<{ plan: Plan; options: PlanOption[]; role: ParcheRole }> {
  await delay(90);

  return withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    const membership = ensureMembership(db, plan.parcheId, actorId);

    return {
      plan,
      options: listPlanOptions(db, plan.id),
      role: membership.role,
    };
  }, false);
}

export async function advancePlanState(actorId: number, planId: number): Promise<Plan> {
  await delay(120);

  return withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureParcheRole(db, plan.parcheId, actorId, ["OWNER", "MODERATOR"]);

    const targetState = nextPlanState(plan.state);
    if (!targetState) throw new Error("Plan is already in its final state");

    if (targetState === "VOTING_OPEN") {
      const options = listPlanOptions(db, plan.id);
      if (options.length < 3) throw new Error("Draft must contain at least 3 options");
      if (new Date(plan.votingEndAt).getTime() <= Date.now()) {
        throw new Error("Voting end date must be in the future");
      }
      plan.state = "VOTING_OPEN";
    }

    if (targetState === "VOTING_CLOSED") {
      plan.state = "VOTING_CLOSED";
      plan.winningOptionId = computeWinningOptionId(db, plan.id);
    }

    if (targetState === "SCHEDULED") {
      if (!plan.winningOptionId) {
        plan.winningOptionId = computeWinningOptionId(db, plan.id);
      }
      const winner = resolveOptionOrThrow(db, plan.winningOptionId);
      const winnerMs = new Date(winner.time).getTime();

      plan.state = "SCHEDULED";
      plan.checkInOpenAt = new Date(winnerMs - 30 * 60 * 1000).toISOString();
      plan.checkInCloseAt = new Date(winnerMs + 2 * 60 * 60 * 1000).toISOString();
    }

    addActivity(db, plan.parcheId, actorId, "PLAN_STATE_CHANGED", "PLAN", plan.id, plan.state);

    return plan;
  });
}

export async function castVote(actorId: number, planId: number, optionId: number): Promise<void> {
  await delay(100);

  withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);

    if (plan.state !== "VOTING_OPEN") throw new Error("Voting is not open for this plan");
    if (Date.now() >= new Date(plan.votingEndAt).getTime()) {
      plan.state = "VOTING_CLOSED";
      plan.winningOptionId = computeWinningOptionId(db, plan.id);
      throw new Error("Voting just closed. Please refresh the page");
    }

    const option = resolveOptionOrThrow(db, optionId);
    if (option.planId !== planId) throw new Error("Invalid option for this plan");

    const vote = db.votes.find((item) => item.planId === planId && item.userId === actorId);
    if (vote) {
      vote.optionId = optionId;
      vote.updatedAt = new Date().toISOString();
    } else {
      db.votes.push({
        planId,
        userId: actorId,
        optionId,
        updatedAt: new Date().toISOString(),
      });
    }

    addActivity(db, plan.parcheId, actorId, "VOTE_CHANGED", "PLAN", plan.id, `Option ${optionId}`);
  });
}

export async function getVoteSummary(actorId: number, planId: number): Promise<VoteSummary> {
  await delay(80);

  return withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);

    const options = listPlanOptions(db, planId);
    const planVotes = db.votes.filter((vote) => vote.planId === planId);
    const totalVotes = planVotes.length;

    const rows: VoteResultRow[] = options.map((option) => {
      const optionVotes = planVotes.filter((vote) => vote.optionId === option.id).length;
      const percentage = totalVotes === 0 ? 0 : Math.round((optionVotes * 10000) / totalVotes) / 100;

      return {
        option,
        votes: optionVotes,
        percentage,
      };
    });

    const myVote = planVotes.find((vote) => vote.userId === actorId);

    return {
      rows,
      totalVotes,
      myVoteOptionId: myVote ? myVote.optionId : null,
    };
  }, false);
}

export async function setAttendance(
  actorId: number,
  planId: number,
  status: AttendanceStatus,
): Promise<void> {
  await delay(100);

  withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);

    const existing = db.attendances.find((item) => item.planId === planId && item.userId === actorId);
    if (existing) {
      existing.status = status;
      existing.updatedAt = new Date().toISOString();
    } else {
      db.attendances.push({
        planId,
        userId: actorId,
        status,
        updatedAt: new Date().toISOString(),
      });
    }

    addActivity(db, plan.parcheId, actorId, "ATTENDANCE_CHANGED", "PLAN", plan.id, status);
  });
}

export async function getAttendance(actorId: number, planId: number): Promise<AttendanceView[]> {
  await delay(80);

  return withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);

    return db.attendances
      .filter((item) => item.planId === planId)
      .map((item) => ({
        user: sanitizeUser(findUserById(db, item.userId)),
        status: item.status,
        updatedAt: item.updatedAt,
      }))
      .sort((a, b) => a.user.fullName.localeCompare(b.user.fullName));
  }, false);
}

export async function checkIn(actorId: number, planId: number): Promise<void> {
  await delay(100);

  withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);

    if (plan.state !== "SCHEDULED") throw new Error("Check-in is only available for scheduled plans");
    if (!plan.checkInOpenAt || !plan.checkInCloseAt) throw new Error("Check-in window is not configured");

    const now = Date.now();
    const startsAt = new Date(plan.checkInOpenAt).getTime();
    const endsAt = new Date(plan.checkInCloseAt).getTime();

    if (now < startsAt || now > endsAt) {
      throw new Error("Check-in is outside the allowed time window");
    }

    const alreadyCheckedIn = db.checkIns.some((item) => item.planId === planId && item.userId === actorId);
    if (!alreadyCheckedIn) {
      db.checkIns.push({
        planId,
        userId: actorId,
        checkedInAt: new Date().toISOString(),
      });
      addActivity(db, plan.parcheId, actorId, "CHECK_IN", "PLAN", plan.id, "Checked in");
    }
  });
}

export async function hasUserCheckedIn(actorId: number, planId: number): Promise<boolean> {
  await delay(70);

  return withDb((db) => {
    const plan = resolvePlanOrThrow(db, planId);
    ensureMembership(db, plan.parcheId, actorId);
    return db.checkIns.some((item) => item.planId === planId && item.userId === actorId);
  }, false);
}

export async function getParcheRanking(actorId: number, parcheId: number): Promise<RankingRow[]> {
  await delay(100);

  return withDb((db) => {
    ensureMembership(db, parcheId, actorId);

    const members = db.memberships.filter((item) => item.parcheId === parcheId);
    const scheduledPlans = db.plans.filter((item) => item.parcheId === parcheId && item.state === "SCHEDULED");

    const now = Date.now();

    const ranking: RankingRow[] = members.map((member) => {
      const user = sanitizeUser(findUserById(db, member.userId));

      const plansCreated = db.plans.filter((item) => item.parcheId === parcheId && item.createdBy === member.userId).length;

      const plansScheduled = db.plans.filter(
        (item) => item.parcheId === parcheId && item.createdBy === member.userId && item.state === "SCHEDULED",
      ).length;

      const ghostScore = scheduledPlans.reduce((accumulator, plan) => {
        if (!plan.checkInCloseAt || now < new Date(plan.checkInCloseAt).getTime()) {
          return accumulator;
        }

        const hasVoted = db.votes.some((vote) => vote.planId === plan.id && vote.userId === member.userId);
        const attendance = db.attendances.find(
          (attendanceItem) => attendanceItem.planId === plan.id && attendanceItem.userId === member.userId,
        );
        const saidYes = attendance?.status === "YES";
        const checkedIn = db.checkIns.some((item) => item.planId === plan.id && item.userId === member.userId);

        if ((hasVoted || saidYes) && !checkedIn) {
          return accumulator + 1;
        }

        return accumulator;
      }, 0);

      return {
        user,
        organizerScore: plansCreated + plansScheduled,
        ghostScore,
      };
    });

    ranking.sort((a, b) => {
      if (b.organizerScore !== a.organizerScore) return b.organizerScore - a.organizerScore;
      if (a.ghostScore !== b.ghostScore) return a.ghostScore - b.ghostScore;
      return a.user.fullName.localeCompare(b.user.fullName);
    });

    return ranking;
  }, false);
}

export async function getParcheActivity(
  actorId: number,
  parcheId: number,
  limit = 20,
): Promise<ActivityView[]> {
  await delay(100);

  return withDb((db) => {
    ensureMembership(db, parcheId, actorId);

    return db.activities
      .filter((item) => item.parcheId === parcheId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
      .map((event) => ({
        event,
        user: sanitizeUser(findUserById(db, event.userId)),
      }));
  }, false);
}

export async function resetSeedData(): Promise<void> {
  await delay(60);
  const seeded = createSeedDb();
  writeDb(seeded);
}




