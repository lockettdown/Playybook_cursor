"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Mail,
  Volume2,
  Vibrate,
  Info,
  Shield,
  UserPlus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  LogOut,
  LogIn,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAppMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
} from "@/lib/messages-queries";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import type { AppMember, MemberRole } from "@/types";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  coach: "Coach",
  parent: "Parent",
  player: "Player",
};

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: "text-pb-orange bg-pb-orange/10",
  coach: "text-pb-blue bg-pb-blue/10",
  parent: "text-green-400 bg-green-500/10",
  player: "text-purple-400 bg-purple-500/10",
};

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

function Toggle({ enabled, onToggle }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? "bg-pb-orange" : "bg-pb-surface"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function MemberRow({
  m,
  currentMember,
  canManage,
  onRoleChange,
  onRemove,
  isRoleChanging,
  isRemoving,
}: {
  m: AppMember;
  currentMember: AppMember | null;
  canManage: boolean;
  onRoleChange: (id: string, role: "coach" | "parent" | "player") => void;
  onRemove: (id: string) => void;
  isRoleChanging: boolean;
  isRemoving: boolean;
}) {
  const isSelf = currentMember?.id === m.id;
  const isOwner = m.role === "owner";

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center justify-center size-9 rounded-full bg-pb-surface shrink-0">
        <User className="size-4 text-pb-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">
          {m.displayName || m.email}
          {isSelf && <span className="text-pb-muted font-normal ml-1">(you)</span>}
        </p>
        <p className="text-pb-muted text-xs truncate">{m.email}</p>
        {m.inviteStatus === "pending" && (
          <span className="text-xs text-amber-400">Invite pending</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canManage && !isOwner && !isSelf ? (
          <div className="relative">
            <select
              value={m.role}
              onChange={(e) =>
                onRoleChange(m.id, e.target.value as "coach" | "parent" | "player")
              }
              disabled={isRoleChanging}
              className="appearance-none text-xs font-semibold pl-2.5 pr-6 py-1 rounded-full bg-pb-surface text-white border border-white/10 focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <option value="coach">Coach</option>
              <option value="parent">Parent</option>
              <option value="player">Player</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-pb-muted pointer-events-none" />
          </div>
        ) : (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role]}`}>
            {ROLE_LABELS[m.role]}
          </span>
        )}
        {canManage && !isOwner && !isSelf && (
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            disabled={isRemoving}
            aria-label={`Remove ${m.displayName}`}
            className="flex items-center justify-center size-7 rounded-full text-red-400 hover:bg-red-500/10 active:bg-red-500/20 transition-colors disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  const { member, signOut } = useAuth();
  const { isOwner, canManageMembers } = usePermissions();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"coach" | "parent" | "player">("coach");
  const [inviteError, setInviteError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInLoading, setSignInLoading] = useState(false);
  const { signIn } = useAuth();

  const queryClient = useQueryClient();

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["appMembers"],
    queryFn: fetchAppMembers,
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteMember(inviteEmail.trim(), inviteName.trim(), inviteRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appMembers"] });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("coach");
      setInviteError("");
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: "coach" | "parent" | "player" }) =>
      updateMemberRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appMembers"] }),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appMembers"] }),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteError("Email is required");
      return;
    }
    inviteMutation.mutate();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError("");
    const err = await signIn(signInEmail, signInPassword);
    setSignInLoading(false);
    if (err) setSignInError(err);
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center size-10 rounded-full bg-pb-blue/20">
          <Settings className="size-5 text-pb-blue" />
        </div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="flex flex-col gap-6">

        {/* Profile */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Profile
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            {member ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                  <User className="size-5 text-pb-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{member.displayName || "—"}</p>
                    <p className="text-pb-muted text-xs">Display name</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                  <Mail className="size-5 text-pb-blue shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{member.email}</p>
                    <p className="text-pb-muted text-xs">Email</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-pb-card-hover active:bg-pb-card-hover transition-colors"
                >
                  <LogOut className="size-5 text-red-400 shrink-0" />
                  <span className="text-red-400 font-medium">Sign out</span>
                </button>
              </>
            ) : (
              <div className="px-4 py-4">
                <p className="text-pb-muted text-sm mb-3 flex items-center gap-2">
                  <LogIn className="size-4" /> Sign in to manage your profile and team
                </p>
                <form onSubmit={handleSignIn} className="flex flex-col gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="bg-pb-surface text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-pb-blue placeholder:text-pb-muted"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="bg-pb-surface text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-pb-blue placeholder:text-pb-muted"
                  />
                  {signInError && <p className="text-red-400 text-xs">{signInError}</p>}
                  <button
                    type="submit"
                    disabled={signInLoading}
                    className="bg-pb-blue text-white text-sm font-semibold rounded-xl py-2.5 disabled:opacity-50 hover:bg-pb-blue/80 transition-colors"
                  >
                    {signInLoading ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </section>

        {/* Team Members */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Team Members
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            {loadingMembers ? (
              <p className="text-pb-muted text-sm px-4 py-4">Loading members…</p>
            ) : members.length === 0 ? (
              <p className="text-pb-muted text-sm px-4 py-4">No members yet. Invite someone below.</p>
            ) : (
              members.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  currentMember={member}
                  canManage={canManageMembers}
                  onRoleChange={(id, role) => roleChangeMutation.mutate({ id, role })}
                  onRemove={(id) => removeMutation.mutate(id)}
                  isRoleChanging={roleChangeMutation.isPending}
                  isRemoving={removeMutation.isPending}
                />
              ))
            )}
          </div>

          {/* Pending invites copy-link area */}
          {members.some((m) => m.inviteStatus === "pending" && m.inviteToken) && (
            <div className="mt-2 bg-pb-card rounded-[14px] overflow-hidden">
              <p className="text-xs text-pb-muted px-4 pt-3 pb-1 uppercase tracking-wider font-semibold">
                Pending invite links
              </p>
              {members
                .filter((m) => m.inviteStatus === "pending" && m.inviteToken)
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-2.5 border-t border-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{m.displayName || m.email}</p>
                      <p className="text-pb-muted text-xs">{ROLE_LABELS[m.role]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyInviteLink(m.inviteToken!)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-pb-blue hover:text-pb-blue/80 transition-colors shrink-0 ml-3"
                    >
                      {copiedToken === m.inviteToken ? (
                        <>
                          <Check className="size-3.5 text-green-400" />
                          <span className="text-green-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          Copy link
                        </>
                      )}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Invite form — visible to owners only */}
          {isOwner && (
            <div className="mt-3 bg-pb-card rounded-[14px] p-4">
              <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <UserPlus className="size-4 text-pb-orange" />
                Invite someone
              </p>
              <form onSubmit={handleInvite} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="bg-pb-surface text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-pb-orange placeholder:text-pb-muted"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-pb-surface text-white text-sm rounded-xl px-3 py-2.5 border border-white/10 focus:outline-none focus:border-pb-orange placeholder:text-pb-muted"
                />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as "coach" | "parent" | "player")}
                      className="appearance-none w-full bg-pb-surface text-white text-sm rounded-xl px-3 py-2.5 pr-8 border border-white/10 focus:outline-none focus:border-pb-orange"
                    >
                      <option value="coach">Coach</option>
                      <option value="parent">Parent</option>
                      <option value="player">Player</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-pb-muted pointer-events-none" />
                  </div>
                  <button
                    type="submit"
                    disabled={inviteMutation.isPending}
                    className="bg-pb-orange text-white text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-50 hover:bg-pb-orange/80 transition-colors whitespace-nowrap"
                  >
                    {inviteMutation.isPending ? "Sending…" : "Send invite"}
                  </button>
                </div>
                {inviteError && <p className="text-red-400 text-xs">{inviteError}</p>}
                {inviteMutation.isSuccess && (
                  <p className="text-green-400 text-xs">Invite created — copy the link above to share it.</p>
                )}
              </form>
            </div>
          )}
        </section>

        {/* Permissions */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Permissions
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            {(
              [
                {
                  role: "owner" as MemberRole,
                  desc: "Full access — manage members, edit teams, events, and all content.",
                },
                {
                  role: "coach" as MemberRole,
                  desc: "Can add/edit/delete players, teams, and events.",
                },
                {
                  role: "parent" as MemberRole,
                  desc: "Read-only — can view schedule and send messages.",
                },
                {
                  role: "player" as MemberRole,
                  desc: "Read-only — can view schedule and send messages.",
                },
              ] as { role: MemberRole; desc: string }[]
            ).map(({ role, desc }, i, arr) => (
              <div
                key={role}
                className={`flex items-start gap-3 px-4 py-3 ${i < arr.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <span className={`mt-0.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
                <p className="text-pb-muted text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Preferences
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Shield className="size-5 text-pb-orange" />
                <span className="text-white">Dark Mode</span>
              </div>
              <Toggle enabled={true} onToggle={() => {}} />
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Volume2 className="size-5 text-pb-orange" />
                <span className="text-white">Sound Effects</span>
              </div>
              <Toggle enabled={soundEffects} onToggle={() => setSoundEffects(!soundEffects)} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Vibrate className="size-5 text-pb-orange" />
                <span className="text-white">Haptic Feedback</span>
              </div>
              <Toggle enabled={hapticFeedback} onToggle={() => setHapticFeedback(!hapticFeedback)} />
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            About
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Info className="size-5 text-pb-muted" />
                <span className="text-white">Version</span>
              </div>
              <span className="text-pb-muted text-sm">1.0.0</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Shield className="size-5 text-pb-muted" />
                <span className="text-white">Privacy Policy</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Info className="size-5 text-pb-muted" />
                <span className="text-white">Terms of Service</span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
