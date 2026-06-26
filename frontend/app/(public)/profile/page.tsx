"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Lock, Bell, Shield, Briefcase, Trash2,
  ChevronRight, ChevronDown, Eye, EyeOff, Check, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${enabled ? "bg-primary border border-border" : "bg-muted border border-border"
        }`}
    >
      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform duration-200 ${enabled ? "translate-x-5 bg-popover" : "translate-x-0 bg-background0"
        }`} />
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-4 py-3 border-b border-border hover:bg-accent/50 transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-sm font-semibold text-foreground flex-1 text-left">{title}</h2>
        <ChevronDown
          size={16}
          className={`text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
        />
      </button>
      {open && <div className="divide-y divide-border">{children}</div>}
    </div>
  );
}

function SettingRow({
  label, description, action,
}: { label: string; description?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwSaved, setPwSaved] = useState(false);

  const [notifs, setNotifs] = useState({
    emailJobAlerts: true,
    emailApplications: true,
    pushNewJobs: false,
    pushMessages: true,
    smsAlerts: false,
    weeklyDigest: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisible: true,
    resumeVisible: false,
    activityVisible: true,
    searchable: true,
  });

  const [prefs, setPrefs] = useState({
    openToWork: true,
    remoteOnly: false,
    fullTimeOnly: false,
    emailDigest: true,
  });

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSavePassword = () => {
    if (passwords.next !== passwords.confirm) return;
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 3000);
    setPasswords({ current: "", next: "", confirm: "" });
  };

  const toggleNotif = (k: keyof typeof notifs) => setNotifs(p => ({ ...p, [k]: !p[k] }));
  const togglePrivacy = (k: keyof typeof privacy) => setPrivacy(p => ({ ...p, [k]: !p[k] }));
  const togglePref = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }));

  const pwInput = (key: keyof typeof passwords) => (
    <div className="relative">
      <input
        type={showPw[key] ? "text" : "password"}
        value={passwords[key]}
        onChange={e => setPasswords(p => ({ ...p, [key]: e.target.value }))}
        placeholder={key === "current" ? "Current password" : key === "next" ? "New password" : "Confirm new password"}
        className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring pr-9"
      />
      <button
        type="button"
        onClick={() => setShowPw(p => ({ ...p, [key]: !p[key] }))}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account preferences</p>
        </div>

        <Section title="Account & Security" icon={<Lock size={15} />}>

          <SettingRow
            label="Email Address"
            description={session?.user?.email || "Not set"}
            action={
              <Button size="sm" variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1">
                Change <ChevronRight size={12} />
              </Button>
            }
          />

          <div className="px-4 py-4 space-y-3">
            <p className="text-sm text-foreground">Change Password</p>
            {pwInput("current")}
            {pwInput("next")}
            {pwInput("confirm")}
            {passwords.next && passwords.confirm && passwords.next !== passwords.confirm && (
              <p className="text-xs text-destructive">Passwords don't match</p>
            )}
            <Button
              onClick={handleSavePassword}
              disabled={!passwords.current || !passwords.next || passwords.next !== passwords.confirm}
              className="w-full bg-card border border-border hover:bg-accent text-foreground text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {pwSaved ? <><Check size={14} className="text-primary" /> Saved!</> : "Update Password"}
            </Button>
          </div>

          <SettingRow
            label="Two-Factor Authentication"
            description="Add an extra layer of security"
            action={
              <Button size="sm" variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 border border-border">
                Enable <ChevronRight size={12} />
              </Button>
            }
          />
        </Section>

        <Section title="Notifications" icon={<Bell size={15} />}>
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
          </div>
          <SettingRow
            label="Job Alerts"
            description="New jobs matching your preferences"
            action={<Toggle enabled={notifs.emailJobAlerts} onChange={() => toggleNotif("emailJobAlerts")} />}
          />
          <SettingRow
            label="Application Updates"
            description="Status changes on your applications"
            action={<Toggle enabled={notifs.emailApplications} onChange={() => toggleNotif("emailApplications")} />}
          />
          <SettingRow
            label="Weekly Digest"
            description="Summary of top jobs every week"
            action={<Toggle enabled={notifs.weeklyDigest} onChange={() => toggleNotif("weeklyDigest")} />}
          />

          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Push</p>
          </div>
          <SettingRow
            label="New Jobs"
            description="Instant alerts for new postings"
            action={<Toggle enabled={notifs.pushNewJobs} onChange={() => toggleNotif("pushNewJobs")} />}
          />
          <SettingRow
            label="Messages"
            description="Recruiter messages and replies"
            action={<Toggle enabled={notifs.pushMessages} onChange={() => toggleNotif("pushMessages")} />}
          />

          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">SMS</p>
          </div>
          <SettingRow
            label="SMS Alerts"
            description="Critical updates via text message"
            action={<Toggle enabled={notifs.smsAlerts} onChange={() => toggleNotif("smsAlerts")} />}
          />
        </Section>

        <Section title="Privacy" icon={<Shield size={15} />}>
          <SettingRow
            label="Public Profile"
            description="Recruiters can find and view your profile"
            action={<Toggle enabled={privacy.profileVisible} onChange={() => togglePrivacy("profileVisible")} />}
          />
          <SettingRow
            label="Resume Visibility"
            description="Allow recruiters to download your resume"
            action={<Toggle enabled={privacy.resumeVisible} onChange={() => togglePrivacy("resumeVisible")} />}
          />
          <SettingRow
            label="Activity Status"
            description="Show when you were last active"
            action={<Toggle enabled={privacy.activityVisible} onChange={() => togglePrivacy("activityVisible")} />}
          />
          <SettingRow
            label="Appear in Search"
            description="Show your profile in recruiter searches"
            action={<Toggle enabled={privacy.searchable} onChange={() => togglePrivacy("searchable")} />}
          />
        </Section>

        <Section title="Job Preferences" icon={<Briefcase size={15} />}>
          <SettingRow
            label="#OpenToWork"
            description="Signal to recruiters you're looking"
            action={<Toggle enabled={prefs.openToWork} onChange={() => togglePref("openToWork")} />}
          />
          <SettingRow
            label="Remote Only"
            description="Only show remote job listings"
            action={<Toggle enabled={prefs.remoteOnly} onChange={() => togglePref("remoteOnly")} />}
          />
          <SettingRow
            label="Full-time Only"
            description="Filter out part-time and contract"
            action={<Toggle enabled={prefs.fullTimeOnly} onChange={() => togglePref("fullTimeOnly")} />}
          />
          <SettingRow
            label="Email Job Digest"
            description="Curated daily job recommendations"
            action={<Toggle enabled={prefs.emailDigest} onChange={() => togglePref("emailDigest")} />}
          />
        </Section>

        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-destructive/10">
            <AlertTriangle size={15} className="text-destructive/70" />
            <h2 className="text-sm font-semibold text-destructive/80">Danger Zone</h2>
          </div>
          <div className="divide-y divide-destructive/10">
            <SettingRow
              label="Sign Out"
              description="Revoke active sessions"
              action={
                <Button size="sm" variant="ghost"
                  className="text-xs border border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/" })}>
                  Sign Out
                </Button>
              }
            />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-sm text-foreground">Delete Account</p>
                <p className="text-xs text-muted-foreground mt-0.5">Permanently remove your account and all data. This cannot be undone.</p>
              </div>
              {!deleteConfirm ? (
                <Button size="sm" variant="ghost"
                  onClick={() => setDeleteConfirm(true)}
                  className="text-xs border border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 size={13} className="mr-1.5" /> Delete My Account
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-destructive font-medium">Are you absolutely sure?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost"
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                      Cancel
                    </Button>
                    <Button size="sm"
                      className="text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0">
                      Yes, delete everything
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}