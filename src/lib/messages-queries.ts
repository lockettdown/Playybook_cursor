import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { AppMember, Conversation, Message } from "@/types";

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

function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: row.id as string,
    memberId1: row.member_id_1 as string,
    memberId2: row.member_id_2 as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
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
  role: "parent" | "player"
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

// ── Conversations ──

export async function fetchMyConversations(
  myMemberId: string
): Promise<Conversation[]> {
  const supabase = getSupabaseBrowser();

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .or(`member_id_1.eq.${myMemberId},member_id_2.eq.${myMemberId}`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapConversation);
}

export async function getOrCreateConversation(
  memberId1: string,
  memberId2: string
): Promise<Conversation> {
  const supabase = getSupabaseBrowser();
  const [a, b] = memberId1 < memberId2 ? [memberId1, memberId2] : [memberId2, memberId1];

  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("member_id_1", a)
    .eq("member_id_2", b)
    .limit(1);

  if (existing && existing.length > 0) return mapConversation(existing[0]);

  const { data, error } = await supabase
    .from("conversations")
    .insert({ member_id_1: a, member_id_2: b })
    .select("*")
    .single();

  if (error) throw error;
  return mapConversation(data);
}

// ── Messages ──

export async function fetchMessages(
  conversationId: string
): Promise<Message[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string
): Promise<Message> {
  const supabase = getSupabaseBrowser();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return mapMessage(data);
}

export async function fetchLastMessages(
  conversationIds: string[]
): Promise<Map<string, Message>> {
  if (conversationIds.length === 0) return new Map();

  const supabase = getSupabaseBrowser();
  const result = new Map<string, Message>();

  for (const convId of conversationIds) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      result.set(convId, mapMessage(data[0]));
    }
  }

  return result;
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
