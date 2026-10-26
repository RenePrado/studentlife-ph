"use client";

import { useEffect, useState } from "react";
import { useTheme, type Theme } from "@/components/theme-provider";
import { Camera, Mail, GraduationCap, Wrench, Sun, Moon, Monitor, KeyRound, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api, authApi, resolveAvatarUrl } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import type { User as UserProfile } from "@/types";

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingAcademic, setSavingAcademic] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [personalForm, setPersonalForm] = useState({ fullName: "", phone: "", location: "", bio: "" });
  const [academicForm, setAcademicForm] = useState({ school: "", program: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  // Sync forms when profile loads
  useEffect(() => {
    if (profile) {
      setPersonalForm({
        fullName: profile.full_name || "",
        phone: profile.phone || "",
        location: profile.location || "",
        bio: profile.bio || "",
      });
      setAcademicForm({
        school: profile.school || "",
        program: profile.program || "",
      });
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const result = await api.get<UserProfile>("/profiles");
      if (result.error) {
        console.error("Profile error:", result.error);
        toast.error(`Failed to load profile: ${result.error}`);
      } else {
        setProfile(result.data || { email: user?.email } as UserProfile);
      }
    } catch (error) {
      console.error("Profile error:", error);
      toast.error("Failed to load profile. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const result = await api.upload('/upload/avatar', formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Avatar updated!');
      fetchProfile();
      setUser({ ...user!, avatarUrl: resolveAvatarUrl(result.data?.avatarUrl) });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.current) { toast.error('Enter your current password'); return; }
    if (!passwordForm.next || passwordForm.next.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (passwordForm.next !== passwordForm.confirm) { toast.error('Passwords do not match'); return; }

    setSavingPassword(true);
    const result = await authApi.changePassword(passwordForm.current, passwordForm.next);
    if (result.error) {
      toast.error(result.error);
      setSavingPassword(false);
      return;
    }
    toast.success('Password changed successfully');
    setShowPasswordForm(false);
    setPasswordForm({ current: "", next: "", confirm: "" });
    setSavingPassword(false);
  };

  const handleDeleteAccount = async () => {
    const result = await api.delete("/profiles");
    if (result.error) {
      toast.error(result.error);
      return;
    }

    // Logout and redirect
    const { logout } = useAuthStore.getState();
    await logout();
    toast.success('Account deleted. Redirecting...');
    setTimeout(() => window.location.href = '/', 1500);
  };

  const handleSavePersonal = async () => {
    setSavingPersonal(true);
    const result = await api.put("/profiles", {
      full_name: personalForm.fullName, phone: personalForm.phone,
      location: personalForm.location, bio: personalForm.bio,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile saved!");
      fetchProfile();
      setUser({ ...user!, fullName: personalForm.fullName });
    }
    setSavingPersonal(false);
  };

  const handleSaveAcademic = async () => {
    setSavingAcademic(true);
    const result = await api.put("/profiles", {
      school: academicForm.school, program: academicForm.program,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Academic info saved!");
      fetchProfile();
      setUser({ ...user!, school: academicForm.school, program: academicForm.program });
    }
    setSavingAcademic(false);
  };

  const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const initials = (profile?.full_name || profile?.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile"
        description="Manage your personal information, academic details, and preferences."
      />

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="relative">
              <Avatar className="size-20">
                {profile?.avatar_url && <AvatarImage src={resolveAvatarUrl(profile.avatar_url)} alt={profile?.full_name || "Student"} />}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="size-3.5" />
                </span>
              </label>
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h2 className="text-lg font-semibold">{profile?.full_name || "Student"}</h2>
              <p className="text-xs text-muted-foreground">{profile?.program || "No program"} · {profile?.school || "No school"}</p>
              <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="size-3" />
                  {profile?.email || ""}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="size-3.5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Full Name</Label>
                <Input value={personalForm.fullName} onChange={(e) => setPersonalForm({ ...personalForm, fullName: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input value={profile?.email || ""} disabled className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input value={personalForm.phone} onChange={(e) => setPersonalForm({ ...personalForm, phone: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Location</Label>
                <Input value={personalForm.location} onChange={(e) => setPersonalForm({ ...personalForm, location: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="col-span-full space-y-1.5">
                <Label className="text-xs">Bio</Label>
                <textarea
                  className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={personalForm.bio}
                  onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSavePersonal} disabled={savingPersonal}>{savingPersonal ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap className="size-3.5 text-primary" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">School</Label>
                <Input value={academicForm.school} onChange={(e) => setAcademicForm({ ...academicForm, school: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Program</Label>
                <Input value={academicForm.program} onChange={(e) => setAcademicForm({ ...academicForm, program: e.target.value })} className="h-8 text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={handleSaveAcademic} disabled={savingAcademic}>{savingAcademic ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>
      </div>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sun className="size-3.5 text-primary" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`flex flex-col items-center gap-2 rounded-md border p-4 transition-colors ${
                  theme === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}
              >
                <opt.icon className="size-4 text-primary" />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Account Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">
              <KeyRound className="size-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Change Password</p>
                <p className="text-[10px] text-muted-foreground">Update your account password</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showPasswordForm && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input type="password" placeholder="Current password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="h-8 w-40 text-sm" />
                  <Input type="password" placeholder="New password" value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} className="h-8 w-40 text-sm" />
                  <Input type="password" placeholder="Confirm" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="h-8 w-40 text-sm" />
                  <Button size="sm" onClick={handleChangePassword} disabled={savingPassword}>{savingPassword ? "Saving..." : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowPasswordForm(false)}>Cancel</Button>
                </div>
              )}
              {!showPasswordForm && (
                <Button variant="outline" size="sm" onClick={() => setShowPasswordForm(true)}>Change</Button>
              )}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-3">
              <Trash2 className="size-4 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Delete Account</p>
                <p className="text-[10px] text-muted-foreground">Permanently delete your account and data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Confirm Delete</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                </div>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
