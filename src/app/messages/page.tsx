"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Plus,
  UserPlus,
  Trash2,
  Users,
  MessageCircle,
  Copy,
  Check,
  LogIn,
} from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  fetchAcceptedMembers,
  fetchMyConversations,
  getOrCreateConversation,
  fetchMessages,
  sendMessage,
  fetchLastMessages,
  fetchAppMembers,
  inviteMember,
  removeMember,
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
import type { AppMember, Conversation, Message } from "@/types";

type PageView = "list" | "thread" | "members";

export default function MessagesPage() {
  const router = useRouter();
  const { user, member, loading } = useAuth();

  const [view, setView] = useState<PageView>("list");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [membersMap, setMembersMap] = useState<Map<string, AppMember>>(
    new Map()
  );
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);

  const [newConvOpen, setNewConvOpen] = useState(false);
  const [acceptedMembers, setAcceptedMembers] = useState<AppMember[]>([]);

  // Members management
  const [allMembers, setAllMembers] = useState<AppMember[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invEmail, setInvEmail] = useState("");
  const [invName, setInvName] = useState("");
  const [invRole, setInvRole] = useState<"parent" | "player">("parent");
  const [inviting, setInviting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = member?.role === "owner";

  // Load members map
  const loadMembersMap = useCallback(async () => {
    try {
      const members = await fetchAcceptedMembers();
      const map = new Map<string, AppMember>();
      for (const m of members) map.set(m.id, m);
      setMembersMap(map);
      setAcceptedMembers(members);
    } catch {
      /* ignore */
    }
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!member) return;
    setLoadingConvs(true);
    try {
      const convs = await fetchMyConversations(member.id);
      const lastMsgs = await fetchLastMessages(convs.map((c) => c.id));
      const enriched = convs.map((c) => ({
        ...c,
        lastMessage: lastMsgs.get(c.id),
      }));
      setConversations(enriched);
    } catch {
      /* ignore */
    } finally {
      setLoadingConvs(false);
    }
  }, [member]);

  useEffect(() => {
    if (member) {
      loadMembersMap();
      loadConversations();
    }
  }, [member, loadMembersMap, loadConversations]);

  // Load messages when thread is selected
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const msgs = await fetchMessages(convId);
      setMessages(msgs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (selectedConv) loadMessages(selectedConv.id);
  }, [selectedConv, loadMessages]);

  // Realtime messages subscription
  useEffect(() => {
    if (!selectedConv) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          const msg: Message = {
            id: payload.new.id,
            conversationId: payload.new.conversation_id,
            senderId: payload.new.sender_id,
            body: payload.new.body,
            createdAt: payload.new.created_at,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!messageBody.trim() || !selectedConv || !member || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedConv.id, member.id, messageBody.trim());
      setMessageBody("");
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }, [messageBody, selectedConv, member, sending]);

  const openThread = useCallback(
    (conv: Conversation) => {
      setSelectedConv(conv);
      setView("thread");
    },
    []
  );

  const startNewConversation = useCallback(
    async (otherMemberId: string) => {
      if (!member) return;
      try {
        const conv = await getOrCreateConversation(member.id, otherMemberId);
        setNewConvOpen(false);
        setSelectedConv(conv);
        setView("thread");
        loadConversations();
      } catch {
        /* ignore */
      }
    },
    [member, loadConversations]
  );

  const getOtherMember = useCallback(
    (conv: Conversation): AppMember | undefined => {
      if (!member) return undefined;
      const otherId =
        conv.memberId1 === member.id ? conv.memberId2 : conv.memberId1;
      return membersMap.get(otherId);
    },
    [member, membersMap]
  );

  // Members management
  const loadAllMembers = useCallback(async () => {
    try {
      const members = await fetchAppMembers();
      setAllMembers(members);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (view === "members" && isOwner) loadAllMembers();
  }, [view, isOwner, loadAllMembers]);

  const handleInvite = useCallback(async () => {
    if (!invEmail.trim() || inviting) return;
    setInviting(true);
    try {
      await inviteMember(invEmail.trim(), invName.trim(), invRole);
      setInviteOpen(false);
      setInvEmail("");
      setInvName("");
      setInvRole("parent");
      loadAllMembers();
    } catch {
      /* ignore */
    } finally {
      setInviting(false);
    }
  }, [invEmail, invName, invRole, inviting, loadAllMembers]);

  const handleRemove = useCallback(async () => {
    if (!removeConfirmId || removing) return;
    setRemoving(true);
    try {
      await removeMember(removeConfirmId);
      setRemoveConfirmId(null);
      loadAllMembers();
      loadMembersMap();
    } catch {
      /* ignore */
    } finally {
      setRemoving(false);
    }
  }, [removeConfirmId, removing, loadAllMembers, loadMembersMap]);

  const copyInviteLink = useCallback(
    (token: string) => {
      const url = `${window.location.origin}/join/${token}`;
      navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    },
    []
  );

  const conversationPartners = useMemo(() => {
    if (!member) return new Set<string>();
    const set = new Set<string>();
    for (const c of conversations) {
      const otherId =
        c.memberId1 === member.id ? c.memberId2 : c.memberId1;
      set.add(otherId);
    }
    return set;
  }, [conversations, member]);

  const availableForNewConv = useMemo(
    () =>
      acceptedMembers.filter(
        (m) => m.id !== member?.id && !conversationPartners.has(m.id)
      ),
    [acceptedMembers, member, conversationPartners]
  );

  // ── Not authenticated ──
  if (!loading && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pb-dark px-4">
        <MessageCircle size={48} className="text-pb-orange mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Messages</h2>
        <p className="text-sm text-pb-muted mb-6 text-center">
          Sign in to message your team&apos;s players and parents.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="bg-pb-orange text-white hover:bg-pb-orange/90 gap-2"
        >
          <LogIn size={18} />
          Sign in
        </Button>
      </div>
    );
  }

  if (loading || !member) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pb-dark">
        <p className="text-pb-muted">Loading…</p>
      </div>
    );
  }

  // ── Thread view ──
  if (view === "thread" && selectedConv) {
    const other = getOtherMember(selectedConv);
    return (
      <div className="flex min-h-screen flex-col bg-pb-dark">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-pb-border bg-pb-dark px-4 py-3">
          <button
            type="button"
            onClick={() => {
              setView("list");
              setSelectedConv(null);
              loadConversations();
            }}
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-pb-card"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">
              {other?.displayName ?? "Unknown"}
            </p>
            <p className="truncate text-xs text-pb-muted">
              {other?.role ?? ""}
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4 gap-2">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-pb-muted">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.senderId === member.id;
            const sender = membersMap.get(msg.senderId);
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
              >
                {!isMe && (
                  <span className="mb-0.5 text-[10px] font-medium text-pb-muted">
                    {sender?.displayName ?? "Unknown"}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? "bg-pb-orange text-white rounded-br-md"
                      : "bg-pb-card text-white rounded-bl-md"
                  }`}
                >
                  {msg.body}
                </div>
                <span className="mt-0.5 text-[10px] text-pb-muted">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-0 border-t border-pb-border bg-pb-dark px-4 py-3 pb-safe">
          <div className="flex items-center gap-2">
            <Input
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message…"
              className="flex-1 border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!messageBody.trim() || sending}
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pb-orange text-white transition-colors hover:bg-pb-orange/90 disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Members management view ──
  if (view === "members") {
    return (
      <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView("list")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full active:bg-pb-card"
          >
            <ArrowLeft size={22} className="text-white" />
          </button>
          <h1 className="flex-1 text-xl font-bold text-white">Members</h1>
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

        <div className="space-y-2">
          {allMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-xl bg-pb-card px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {m.displayName || m.email}
                </p>
                <div className="flex items-center gap-2 text-xs text-pb-muted">
                  <span className="capitalize">{m.role}</span>
                  <span>·</span>
                  <span
                    className={
                      m.inviteStatus === "accepted"
                        ? "text-emerald-400"
                        : "text-yellow-400"
                    }
                  >
                    {m.inviteStatus}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
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
                    onClick={() => setRemoveConfirmId(m.id)}
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
              No members yet. Invite parents and players to get started.
            </p>
          )}
        </div>

        {/* Invite dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="border-pb-border bg-pb-dark text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                Invite a member
              </DialogTitle>
              <p className="text-sm text-pb-muted">
                They&apos;ll get an invite link to join and start messaging.
              </p>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                  Email
                </label>
                <Input
                  type="email"
                  value={invEmail}
                  onChange={(e) => setInvEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                  Display name
                </label>
                <Input
                  value={invName}
                  onChange={(e) => setInvName(e.target.value)}
                  placeholder="Jane Doe"
                  className="border-pb-border bg-pb-card text-white placeholder:text-pb-muted"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-pb-muted">
                  Role
                </label>
                <div className="flex gap-2">
                  {(["parent", "player"] as const).map((r) => (
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
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="border-pb-border text-white"
              >
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
        <Dialog
          open={!!removeConfirmId}
          onOpenChange={(open) => !open && setRemoveConfirmId(null)}
        >
          <DialogContent className="border-pb-border bg-pb-dark text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Remove member?</DialogTitle>
              <p className="text-sm text-pb-muted">
                This person will no longer be able to access messages. This
                cannot be undone.
              </p>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setRemoveConfirmId(null)}
                disabled={removing}
                className="border-pb-border text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRemove}
                disabled={removing}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {removing ? "Removing…" : "Remove"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Conversations list view ──
  return (
    <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => setView("members")}
              className="flex size-11 items-center justify-center rounded-full bg-pb-card text-pb-muted transition-colors hover:bg-pb-card-hover hover:text-white"
              title="Manage members"
            >
              <Users size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              loadMembersMap();
              setNewConvOpen(true);
            }}
            className="flex size-11 items-center justify-center rounded-full bg-pb-orange text-white transition-colors hover:bg-pb-orange/90"
            title="New conversation"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {loadingConvs ? (
        <p className="py-12 text-center text-sm text-pb-muted">Loading…</p>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <MessageCircle size={48} className="text-pb-card mb-4" />
          <p className="text-sm text-pb-muted mb-1">No conversations yet</p>
          <p className="text-xs text-pb-muted">
            Tap + to start a new conversation
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const other = getOtherMember(conv);
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => openThread(conv)}
                className="flex w-full items-center gap-3 rounded-xl bg-pb-card px-4 py-3 text-left transition-colors active:bg-pb-card-hover"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pb-active">
                  <span className="text-sm font-bold text-pb-orange">
                    {(other?.displayName ?? "?")[0].toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {other?.displayName ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-pb-muted">
                    {conv.lastMessage?.body ?? "No messages yet"}
                  </p>
                </div>
                {conv.lastMessage && (
                  <span className="shrink-0 text-[10px] text-pb-muted">
                    {new Date(conv.lastMessage.createdAt).toLocaleDateString(
                      [],
                      { month: "short", day: "numeric" }
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* New conversation dialog */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="border-pb-border bg-pb-dark text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              New conversation
            </DialogTitle>
            <p className="text-sm text-pb-muted">
              Pick a member to message
            </p>
          </DialogHeader>
          <div className="max-h-64 space-y-1 overflow-y-auto py-2">
            {availableForNewConv.length === 0 ? (
              <p className="py-6 text-center text-sm text-pb-muted">
                {acceptedMembers.length <= 1
                  ? "No other members yet. Invite someone first!"
                  : "You already have a conversation with every member."}
              </p>
            ) : (
              availableForNewConv.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => startNewConversation(m.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-pb-card-hover"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pb-active">
                    <span className="text-xs font-bold text-pb-orange">
                      {(m.displayName ?? "?")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {m.displayName || m.email}
                    </p>
                    <p className="text-xs capitalize text-pb-muted">
                      {m.role}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
