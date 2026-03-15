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
  const { member } = useAuth();
  const role = member?.role ?? null;
  const isOwner = role === "owner";
  const isCoach = role === "coach";

  // Only restrict editing for explicit parent/player roles.
  // null (unauthenticated or no member record) defaults to full access.
  const canEdit = role !== "parent" && role !== "player";

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
