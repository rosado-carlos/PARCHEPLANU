import type { ParcheRole, UserProfile } from "../../types";
import Button from "../ui/Button";

type MemberItem = {
  user: UserProfile;
  role: ParcheRole;
};

type Props = {
  members: MemberItem[];
  canManageRoles: boolean;
  onRoleChange: (userId: number, role: ParcheRole) => void;
};

export default function MemberList({ members, canManageRoles, onRoleChange }: Props) {
  return (
    <section className="rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="m-0 text-base font-semibold text-text">Members</h3>

      <div className="mt-3 flex flex-col gap-3">
        {members.map((member) => (
          <div
            key={member.user.id}
            className="flex flex-col gap-2 rounded-btn border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="m-0 text-sm font-semibold text-text">{member.user.fullName}</p>
              <p className="mt-1 text-xs text-muted">{member.user.universityEmail}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border px-2 py-1 text-xs text-muted">{member.role}</span>
              {canManageRoles && member.role !== "OWNER" && (
                <Button
                  variant="secondary"
                  onClick={() => onRoleChange(member.user.id, member.role === "MODERATOR" ? "MEMBER" : "MODERATOR")}
                >
                  {member.role === "MODERATOR" ? "Demote" : "Promote"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
