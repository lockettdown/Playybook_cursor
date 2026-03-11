"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Volume2,
  Vibrate,
  Download,
  RefreshCw,
  Trash2,
  Info,
  Shield,
  ChevronRight,
} from "lucide-react";

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

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  toggle?: { enabled: boolean; onToggle: () => void };
  showChevron?: boolean;
  isLast?: boolean;
}

function SettingRow({ icon, label, value, toggle, showChevron, isLast }: SettingRowProps) {
  return (
    <div
      className={`flex items-center justify-between min-h-[44px] px-4 py-3 ${
        !isLast ? "border-b border-white/5" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-white">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-pb-muted text-sm">{value}</span>}
        {toggle && <Toggle enabled={toggle.enabled} onToggle={toggle.onToggle} />}
        {showChevron && <ChevronRight className="size-4 text-pb-muted" />}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [soundEffects, setSoundEffects] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  return (
    <div className="min-h-screen bg-pb-dark px-4 pt-6 pb-28">
      {/* Header */}
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
            <SettingRow
              icon={<User className="size-5 text-pb-blue" />}
              label="Coach Name"
              value="Coach Thompson"
            />
            <SettingRow
              icon={<Bell className="size-5 text-pb-blue" />}
              label="Email"
              value="coach@tigers.com"
              isLast
            />
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Preferences
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            <SettingRow
              icon={<Shield className="size-5 text-pb-orange" />}
              label="Dark Mode"
              toggle={{ enabled: true, onToggle: () => {} }}
            />
            <SettingRow
              icon={<Volume2 className="size-5 text-pb-orange" />}
              label="Sound Effects"
              toggle={{
                enabled: soundEffects,
                onToggle: () => setSoundEffects(!soundEffects),
              }}
            />
            <SettingRow
              icon={<Vibrate className="size-5 text-pb-orange" />}
              label="Haptic Feedback"
              toggle={{
                enabled: hapticFeedback,
                onToggle: () => setHapticFeedback(!hapticFeedback),
              }}
              isLast
            />
          </div>
        </section>

        {/* Data Management */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            Data Management
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            <SettingRow
              icon={<Download className="size-5 text-pb-blue" />}
              label="Export Data"
              showChevron
            />
            <SettingRow
              icon={<RefreshCw className="size-5 text-pb-blue" />}
              label="Sync Settings"
              showChevron
            />
            <SettingRow
              icon={<Trash2 className="size-5 text-red-400" />}
              label="Clear Cache"
              showChevron
              isLast
            />
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-sm font-semibold text-pb-muted uppercase tracking-wider mb-2 px-1">
            About
          </h2>
          <div className="bg-pb-card rounded-[14px] overflow-hidden">
            <SettingRow
              icon={<Info className="size-5 text-pb-muted" />}
              label="Version"
              value="1.0.0"
            />
            <SettingRow
              icon={<Shield className="size-5 text-pb-muted" />}
              label="Privacy Policy"
              showChevron
            />
            <SettingRow
              icon={<Info className="size-5 text-pb-muted" />}
              label="Terms of Service"
              showChevron
              isLast
            />
          </div>
        </section>
      </div>
    </div>
  );
}
