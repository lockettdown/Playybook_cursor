import { useAuth } from "@/components/providers/AuthProvider";

export interface Permissions {
  role: string | null;
  isOwner: boolean;
  isCoach: boolean;
  canEdit: boolean;
  canEditTeams: boolean;
  canEditEvents: boolean;
  canManageMembers: boolean;
}

export function usePermissions(): Permissions {
  const { member, loading } = useAuth();
  const role = member?.role ?? null;
  const isOwner = role === "owner";
  const isCoach = role === "coach";
  const isReadOnly = role === "parent" || role === "player";

  // Allow editing when: signed in as owner/coach, OR when no member record exists
  // (unauthenticated or tables not yet configured). Only restrict for explicit parent/player roles.
  const canEdit = loading ? false : isReadOnly ? false : true;

  return {
    role,
    isOwner,
    isCoach,
    canEdit,
    canEditTeams: canEdit,
    canEditEvents: canEdit,
    canManageMembers: isOwner,
  };
}
