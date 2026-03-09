import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Search, ShieldCheck, UserPlus, Trash2, Link2, Unlink } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>("student");
  const [creating, setCreating] = useState(false);

  // Assign student state
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: allRoles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const { data: teacherStudents } = useQuery({
    queryKey: ["admin-teacher-students"],
    queryFn: async () => {
      const { data } = await supabase.from("teacher_students").select("*");
      return data ?? [];
    },
  });

  const getUserRoles = (userId: string) => allRoles?.filter((r) => r.user_id === userId).map((r) => r.role as AppRole) ?? [];

  const teachers = profiles?.filter((p) => getUserRoles(p.user_id).includes("teacher")) ?? [];
  const students = profiles?.filter((p) => getUserRoles(p.user_id).includes("student")) ?? [];

  const getAssignedTeacher = (studentUserId: string) => {
    const assignment = teacherStudents?.find((ts) => ts.student_id === studentUserId);
    if (!assignment) return null;
    return profiles?.find((p) => p.user_id === assignment.teacher_id);
  };

  const getAssignedStudents = (teacherUserId: string) => {
    const assignments = teacherStudents?.filter((ts) => ts.teacher_id === teacherUserId) ?? [];
    return assignments.map((a) => profiles?.find((p) => p.user_id === a.student_id)).filter(Boolean);
  };

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast({ title: "Role added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast({ title: "Role removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignStudentMutation = useMutation({
    mutationFn: async ({ teacherId, studentId }: { teacherId: string; studentId: string }) => {
      const { error } = await supabase.from("teacher_students").insert({ teacher_id: teacherId, student_id: studentId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teacher-students"] });
      toast({ title: "Student assigned to teacher" });
      setSelectedTeacher("");
      setSelectedStudent("");
      setAssignOpen(false);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unassignStudentMutation = useMutation({
    mutationFn: async ({ teacherId, studentId }: { teacherId: string; studentId: string }) => {
      const { error } = await supabase.from("teacher_students").delete().eq("teacher_id", teacherId).eq("student_id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-teacher-students"] });
      toast({ title: "Student unassigned" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { action: "delete", user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
      qc.invalidateQueries({ queryKey: ["admin-teacher-students"] });
      toast({ title: "User account deleted" });
    },
    onError: (e: any) => toast({ title: "Error deleting user", description: e.message, variant: "destructive" }),
  });

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { name: newName, email: newEmail, password: newPassword, role: newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: `${newRole === "teacher" ? "Teacher" : "Student"} account created successfully` });
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("student");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-all-roles"] });
    } catch (e: any) {
      toast({ title: "Error creating user", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  const filteredProfiles = profiles?.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    if (roleFilter === "all") return matchesSearch;
    const roles = getUserRoles(p.user_id);
    return matchesSearch && roles.includes(roleFilter as AppRole);
  }) ?? [];

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "teacher": return "default" as const;
      default: return "secondary" as const;
    }
  };

  // Students not yet assigned to the selected teacher
  const unassignedStudents = students.filter((s) => {
    if (!selectedTeacher) return true;
    return !teacherStudents?.some((ts) => ts.teacher_id === selectedTeacher && ts.student_id === s.user_id);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and student-teacher assignments</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Link2 className="h-4 w-4" /> Assign Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Student to Teacher</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {t.name || t.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedStudents.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.name || s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => assignStudentMutation.mutate({ teacherId: selectedTeacher, studentId: selectedStudent })}
                  disabled={!selectedTeacher || !selectedStudent || assignStudentMutation.isPending}
                >
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" /> Create Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="create-name">Full Name</Label>
                  <Input id="create-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">Email</Label>
                  <Input id="create-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-password">Password</Label>
                  <Input id="create-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? "Creating…" : "Create Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Teacher-Student Assignments Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Teacher-Student Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No teachers yet</p>
          ) : (
            <div className="space-y-4">
              {teachers.map((teacher) => {
                const assigned = getAssignedStudents(teacher.user_id);
                return (
                  <div key={teacher.user_id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">Teacher</Badge>
                      <span className="font-medium">{teacher.name || teacher.email}</span>
                      <span className="text-sm text-muted-foreground">({assigned.length} students)</span>
                    </div>
                    {assigned.length > 0 ? (
                      <div className="flex flex-wrap gap-2 ml-4">
                        {assigned.map((student: any) => (
                          <Badge key={student.user_id} variant="secondary" className="gap-1">
                            {student.name || student.email}
                            <button
                              onClick={() => unassignStudentMutation.mutate({ teacherId: teacher.user_id, studentId: student.user_id })}
                              className="ml-1 hover:text-destructive"
                              title="Unassign student"
                            >
                              <Unlink className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground ml-4">No students assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> All Users ({filteredProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="teacher">Teachers</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingProfiles ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Loading users…</p>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((p) => {
                    const roles = getUserRoles(p.user_id);
                    const availableRoles: AppRole[] = (["student", "teacher", "admin"] as AppRole[]).filter((r) => !roles.includes(r));
                    const assignedTeacher = getAssignedTeacher(p.user_id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{p.email}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {roles.map((r) => (
                              <Badge key={r} variant={roleBadgeVariant(r)} className="gap-1">
                                {r}
                                <button
                                  onClick={() => removeRoleMutation.mutate({ userId: p.user_id, role: r })}
                                  className="ml-1 hover:text-destructive-foreground"
                                  title="Remove role"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {assignedTeacher ? (
                            <span className="text-sm">{assignedTeacher.name || assignedTeacher.email}</span>
                          ) : roles.includes("student") ? (
                            <span className="text-sm text-muted-foreground">Unassigned</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {availableRoles.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {availableRoles.map((r) => (
                                <Button key={r} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addRoleMutation.mutate({ userId: p.user_id, role: r })}>
                                  <UserPlus className="h-3 w-3" /> {r}
                                </Button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProfiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
