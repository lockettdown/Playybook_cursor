"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MemberEntry {
  id: string;
  name: string;
  number: string;
  position: string;
}

function createEmptyMember(): MemberEntry {
  return { id: crypto.randomUUID(), name: "", number: "", position: "" };
}

export interface CreatedTeamData {
  teamName: string;
  members: { id: string; name: string; number: string; position: string }[];
}

interface AddTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (data: CreatedTeamData) => void;
}

export function AddTeamModal({ open, onOpenChange, onCreated }: AddTeamModalProps) {
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<MemberEntry[]>([createEmptyMember()]);

  function addMember() {
    setMembers((prev) => [...prev, createEmptyMember()]);
  }

  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMember(id: string, field: keyof Omit<MemberEntry, "id">, value: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  function handleCreate() {
    const trimmedName = teamName.trim();
    if (!trimmedName) return;
    onCreated?.({
      teamName: trimmedName,
      members: members.map((m) => ({ id: m.id, name: m.name, number: m.number, position: m.position })),
    });
    onOpenChange(false);
    setTeamName("");
    setMembers([createEmptyMember()]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-6 bg-pb-dark border-pb-border">
        <DialogHeader>
          <DialogTitle className="text-xs font-semibold uppercase tracking-wider text-pb-muted">
            Team Name
          </DialogTitle>
        </DialogHeader>

        <Input
          placeholder="Enter team name"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="h-12 rounded-[10px] border-pb-border bg-pb-card text-sm text-white placeholder:text-pb-muted focus-visible:ring-pb-orange"
        />

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white">Team Members</h3>

          {members.map((member) => (
            <div key={member.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Player name"
                  value={member.name}
                  onChange={(e) => updateMember(member.id, "name", e.target.value)}
                  className="h-11 flex-1 rounded-[10px] border-pb-border bg-pb-card text-sm text-white placeholder:text-pb-muted focus-visible:ring-pb-orange"
                />
                <Input
                  placeholder="No."
                  value={member.number}
                  onChange={(e) => updateMember(member.id, "number", e.target.value)}
                  className="h-11 w-16 rounded-[10px] border-pb-border bg-pb-card text-center text-sm text-white placeholder:text-pb-muted focus-visible:ring-pb-orange"
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="text-pb-muted transition-colors hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <Input
                placeholder="Position"
                value={member.position}
                onChange={(e) => updateMember(member.id, "position", e.target.value)}
                className="h-11 rounded-[10px] border-pb-border bg-pb-card text-sm text-white placeholder:text-pb-muted focus-visible:ring-pb-orange"
              />
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={addMember}
          className="h-12 w-full rounded-full bg-pb-orange text-sm font-semibold text-white hover:bg-pb-orange/90"
        >
          + Add Member
        </Button>

        <Button
          type="button"
          onClick={handleCreate}
          className="h-12 w-full rounded-full bg-pb-orange text-sm font-semibold text-white hover:bg-pb-orange/90"
        >
          Create Team
        </Button>
      </DialogContent>
    </Dialog>
  );
}
