export type ParcheRole = "OWNER" | "MODERATOR" | "MEMBER";

export type PlanState = "DRAFT" | "VOTING_OPEN" | "VOTING_CLOSED" | "SCHEDULED";

export type AttendanceStatus = "YES" | "NO" | "MAYBE";

export type TieBreakRule = "EARLIEST_OPTION";

export interface User {
  id: number;
  fullName: string;
  universityEmail: string;
  universityIdentifier: string;
  major: string;
  avatarUrl?: string;
  password: string;
}

export interface UserProfile {
  id: number;
  fullName: string;
  universityEmail: string;
  universityIdentifier: string;
  major: string;
  avatarUrl?: string;
}

export interface Parche {
  id: number;
  name: string;
  description: string;
  coverImageUrl: string;
  inviteCode: string;
  ownerUserId: number;
  createdAt: string;
}

export interface ParcheMembership {
  parcheId: number;
  userId: number;
  role: ParcheRole;
  joinedAt: string;
}

export interface Plan {
  id: number;
  parcheId: number;
  createdBy: number;
  title: string;
  description: string;
  dateWindowStart: string;
  dateWindowEnd: string;
  votingEndAt: string;
  state: PlanState;
  winningOptionId: number | null;
  tieBreakRule: TieBreakRule;
  checkInOpenAt: string | null;
  checkInCloseAt: string | null;
  createdAt: string;
}

export interface PlanOption {
  id: number;
  planId: number;
  place: string;
  time: string;
  ordinal: number;
}

export interface Vote {
  planId: number;
  userId: number;
  optionId: number;
  updatedAt: string;
}

export interface AttendanceRecord {
  planId: number;
  userId: number;
  status: AttendanceStatus;
  updatedAt: string;
}

export interface CheckInRecord {
  planId: number;
  userId: number;
  checkedInAt: string;
}

export interface ActivityEvent {
  id: number;
  parcheId: number;
  userId: number;
  eventType:
    | "PARCHE_CREATED"
    | "MEMBER_JOINED"
    | "PLAN_CREATED"
    | "PLAN_STATE_CHANGED"
    | "VOTE_CHANGED"
    | "ATTENDANCE_CHANGED"
    | "CHECK_IN";
  entityType: "PARCHE" | "PLAN";
  entityId: number;
  createdAt: string;
  metadata?: string;
}

export interface AppDb {
  users: User[];
  parches: Parche[];
  memberships: ParcheMembership[];
  plans: Plan[];
  options: PlanOption[];
  votes: Vote[];
  attendances: AttendanceRecord[];
  checkIns: CheckInRecord[];
  activities: ActivityEvent[];
}

export interface ParcheSummary {
  parche: Parche;
  role: ParcheRole;
  membersCount: number;
  plansCount: number;
}

export interface PlanWithOptions {
  plan: Plan;
  options: PlanOption[];
}

export interface VoteResultRow {
  option: PlanOption;
  votes: number;
  percentage: number;
}

export interface RankingRow {
  user: UserProfile;
  organizerScore: number;
  ghostScore: number;
}
