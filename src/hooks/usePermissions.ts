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
  const canEdit = isOwner || isCoach;

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
