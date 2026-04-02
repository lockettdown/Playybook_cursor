"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  UserPlus,
  Trash2,
  Users,
  MessageCircle,
  Copy,
  Check,
  Shield,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  fetchTeamMessages,
  sendTeamMessage,
  fetchAppMembers,
  inviteMember,
  removeMember,
  type TeamMessage,
} from "@/lib/messages-queries";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AppMember } from "@/types";

type PageView = "chat" | "members";

const roleColors: Record<string, string> = {
  owner: "text-pb-orange",
  coach: "text-pb-blue",
  parent: "text-green-400",
  player: "text-pb-muted",
};

const roleBadge: Record<string, string> = {
  owner: "bg-pb-orange/20 text-pb-orange",
  coach: "bg-pb-blue/20 text-pb-blue",
  parent: "bg-green-500/20 text-green-400",
  player: "bg-pb-muted/20 text-pb-muted",
};

export default function MessagesPage() {
  const router = useRouter();
  const { user, member, loading } = useAuth();

  const [view, setView] = useState<PageView>("chat");
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(true);

  const [allMembers, setAllMembers] = useState<AppMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState<"coach" | "parent" | "player">("parent");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [removeConfirmMember, setRemoveConfirmMember] = useState<AppMember | null>(null);
  const [removing, setRemoving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOwner = member?.role === "owner";

  // ── Load messages ──
  const loadMessages = useCallback(async () => {
    setLoadingMsgs(true);
    try {
      const msgs = await fetchTeamMessages();
      setMessages(msgs);
    } catch {
      /* ignore */
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // ── Realtime subscription ──
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("team_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "team_messages" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const msg: TeamMessage = {
            id: row.id as string,
            senderId: row.sender_id as string,
            senderName: (row.sender_name as string) ?? "",
            senderRole: (row.sender_role as string) ?? "player",
            body: row.body as string,
            createdAt: row.created_at as string,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [member]);

  // ── Auto-scroll ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Load members ──
  const loadMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const members = await fetchAppMembers();
      setAllMembers(members);
    } catch {
      /* ignore */
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (view === "members") loadMembers();
  }, [view, loadMembers]);

  const handleSend = useCallback(async () => {
    if (!body.trim() || !member || sending) return;
    setSending(true);
    try {
      await sendTeamMessage(member.id, member.displayName || member.email, member.role, body.trim());
      setBody("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }, [body, member, sending]);

  const handleInvite = useCallback(async () => {
    if (!invEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await inviteMember(invEmail.trim(), invName.trim(), invRole);
      setInviteOpen(false);
      setInvEmail("");
      setInvName("");
      setInvRole("parent");
      loadMembers();
    } catch {
      /* ignore */
    } finally {
      setInviting(false);
    }
  }, [invEmail, invName, invRole, inviting, loadMembers]);

  const handleRemove = useCallback(async () => {
    if (!removeConfirmMember || removing) return;
    setRemoving(true);
    try {
      await removeMember(removeConfirmMember.id);
      setRemoveConfirmMember(null);
      loadMembers();
    } catch {
      /* ignore */
    } finally {
      setRemoving(false);
    }
  }, [removeConfirmMember, removing, loadMembers]);

  const copyInviteLink = useCallback((token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark">
        <p className="text-pb-muted">Loading…</p>
      </div>
    );
  }

  // ── Members view ──
  if (view === "members") {
    return (
      <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView("chat")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-pb-card"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="flex-1 text-xl font-bold text-white">Team Members</h1>
          {isOwner && (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-pb-orange px-3 py-2 text-xs font-semibold text-white"
            >
              <UserPlus size={14} />
              Invite
            </button>
          )}
        </div>

        {loadingMembers ? (
          <p className="py-12 text-center text-sm text-pb-muted">Loading…</p>
        ) : (
          <div className="space-y-2">
            {allMembers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-pb-card px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pb-active">
                    <span className={`text-sm font-bold ${roleColors[m.role] ?? "text-white"}`}>
                      {(m.displayName || m.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {m.displayName || m.email}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge[m.role]}`}>
                        {m.role}
                      </span>
                      <span className={`text-xs ${m.inviteStatus === "accepted" ? "text-emerald-400" : "text-yellow-400"}`}>
                        {m.inviteStatus === "accepted" ? "Active" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {m.inviteToken && (
                    <button
                      type="button"
                      onClick={() => copyInviteLink(m.inviteToken!)}
                      className="flex size-9 items-center justify-center rounded-full text-pb-muted hover:bg-pb-card-hover hover:text-white"
                      title="Copy invite link"
                    >
                      {copiedToken === m.inviteToken ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                  )}
                  {isOwner && m.role !== "owner" && (
                    <button
                      type="button"
                      onClick={() => setRemoveConfirmMember(m)}
                      className="flex size-9 items-center justify-center rounded-full text-red-400 hover:bg-red-500/10"
                      title="Remove member"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {allMembers.length === 0 && (
              <p className="py-8 text-center text-sm text-pb-muted">
                No members yet. Invite parents, coaches, and players to get started.
              </p>
            )}
          </div>
        )}

        {/* Invite dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="border-pb-border bg-pb-dark text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Invite a member</DialogTitle>
              <p className="text-sm text-pb-muted">
                They&apos;ll get an invite link to join the team chat.
              </p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">Email</label>
                <Input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">Display name</label>
                <Input
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Jane Doe"
                  className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">Role</label>
                <div className="flex gap-2">
                  {(["coach", "parent", "player"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInvRole(r)}
                      className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-colors ${
                        invRole === r
                          ? "bg-pb-orange text-white"
                          : "bg-pb-surface text-pb-muted"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setInviteOpen(false)} className="border-pb-border text-white">
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={!invEmail.trim() || inviting}
                className="bg-pb-orange text-white hover:bg-pb-orange/90"
              >
                {inviting ? "Inviting…" : "Send invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove confirm dialog */}
        <Dialog open={!!removeConfirmMember} onOpenChange={(open) => !open && setRemoveConfirmMember(null)}>
          <DialogContent className="border-pb-border bg-pb-dark text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Remove member?</DialogTitle>
              <p className="text-sm text-pb-muted">
                <span className="font-semibold text-white">{removeConfirmMember?.displayName || removeConfirmMember?.email}</span> will
                no longer have access to the team chat. This cannot be undone.
              </p>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRemoveConfirmMember(null)} disabled={removing} className="border-pb-border text-white">
                Cancel
              </Button>
              <Button onClick={handleRemove} disabled={removing} className="bg-red-600 text-white hover:bg-red-700">
                {removing ? "Removing…" : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Group chat view ──
  return (
    <div className="flex h-screen flex-col bg-pb-dark">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-pb-border bg-pb-dark px-4 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pb-active">
          <MessageCircle size={18} className="text-pb-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-base">Team Chat</p>
          <p className="text-xs text-pb-muted">All team members</p>
        </div>
        <button
          type="button"
          onClick={() => setView("members")}
          className="flex size-10 items-center justify-center rounded-full bg-pb-card text-pb-muted hover:bg-pb-card-hover hover:text-white transition-colors"
          title="Team members"
        >
          <Users size={18} />
        </button>
        {isOwner && (
          <button
            type="button"
            onClick={() => { setView("members"); setInviteOpen(true); }}
            className="flex size-10 items-center justify-center rounded-full bg-pb-orange text-white hover:bg-pb-orange/90 transition-colors"
            title="Manage team"
          >
            <Shield size={18} />
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 gap-3 pb-2">
        {loadingMsgs ? (
          <p className="py-12 text-center text-sm text-pb-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <MessageCircle size={40} className="text-pb-card mb-3" />
            <p className="text-pb-orange text-xs font-semibold uppercase tracking-wide">Coming soon</p>
            <p className="text-white font-semibold">No messages yet</p>
            <p className="text-xs text-pb-muted mt-1">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === member.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-white">{msg.senderName}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${roleBadge[msg.senderRole] ?? ""}`}>
                      {msg.senderRole}
                    </span>
                  </div>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMe
                      ? "bg-pb-orange text-white rounded-br-md"
                      : "bg-pb-card text-white rounded-bl-md"
                  }`}
                >
                  {msg.body}
                </div>
                <span className="mt-0.5 text-[10px] text-pb-muted">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-pb-border bg-pb-dark px-4 py-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        {member ? (
          <div className="flex items-center gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message the team…"
              className="flex-1 border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!body.trim() || sending}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pb-orange text-white transition-colors hover:bg-pb-orange/90 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-xl bg-pb-card py-3 text-sm text-pb-muted hover:bg-pb-card-hover hover:text-white transition-colors"
          >
            Sign in to send a message
          </button>
        )}
      </div>
    </div>
  );
}
