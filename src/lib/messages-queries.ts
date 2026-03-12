import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AppMember } from "@/types";

export interface TeamMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: string;
}

function mapMember(row: Record<string, unknown>): AppMember {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? null,
    email: row.email as string,
    displayName: (row.display_name as string) ?? "",
    role: row.role as AppMember["role"],
    inviteToken: (row.invite_token as string) ?? null,
    inviteStatus: row.invite_status as AppMember["inviteStatus"],
    playerId: (row.player_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): TeamMessage {
  return {
    id: row.id as string,
    senderId: row.sender_id as string,
    senderName: (row.sender_name as string) ?? "",
    senderRole: (row.sender_role as string) ?? "player",
    body: row.body as string,
    createdAt: row.created_at as string,
  };
}

// ── Members ──

export async function fetchAppMembers(): Promise<AppMember[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("app_members")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMember);
}

export async function fetchAcceptedMembers(): Promise<AppMember[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("app_members")
    .select("*")
    .eq("invite_status", "accepted")
    .order("display_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMember);
}

export async function inviteMember(
  email: string,
  displayName: string,
  role: "coach" | "parent" | "player"
): Promise<AppMember> {
  const supabase = getSupabaseBrowser();
  const token = crypto.randomUUID();
  const { data, error } = await supabase
    .from("app_members")
    .insert({
      email,
      display_name: displayName || email,
      role,
      invite_token: token,
      invite_status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapMember(data);
}

export async function removeMember(memberId: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("app_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

// ── Join by invite token ──

export async function resolveInviteToken(
  token: string
): Promise<AppMember | null> {
  const supabase = getSupabaseBrowser();
  const { data } = await supabase
    .from("app_members")
    .select("*")
    .eq("invite_token", token)
    .eq("invite_status", "pending")
    .single();
  if (!data) return null;
  return mapMember(data);
}

export async function acceptInvite(
  memberId: string,
  userId: string,
  displayName?: string
): Promise<void> {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase
    .from("app_members")
    .update({
      user_id: userId,
      invite_status: "accepted",
      invite_token: null,
      ...(displayName ? { display_name: displayName } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memberId);
  if (error) throw error;
}

// ── Team messages (group chat) ──

export async function fetchTeamMessages(): Promise<TeamMessage[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("team_messages")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendTeamMessage(
  senderId: string,
  senderName: string,
  senderRole: string,
  body: string
): Promise<TeamMessage> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("team_messages")
    .insert({ sender_id: senderId, sender_name: senderName, sender_role: senderRole, body })
    .select("*")
    .single();
  if (error) throw error;
  return mapMessage(data);
}
