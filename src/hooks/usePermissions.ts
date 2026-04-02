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
  const { user, member } = useAuth();
  const role = member?.role ?? null;
  const isOwner = role === "owner";
  const isCoach = role === "coach";

  // After DB resets/migrations, users may not have an app_members row yet.
  // Allow authenticated users to edit their own workspace until role rows exist.
  const canEdit = isOwner || isCoach || (!!user && !member);

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
