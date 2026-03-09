import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileEdit, GraduationCap, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "hsl(var(--secondary))"];

export default function AdminDashboard() {
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const { data: courses } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*");
      return data ?? [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("*");
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: async () => {
      const { data } = await supabase.from("submissions").select("*");
      return data ?? [];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data ?? [];
    },
  });

  const totalUsers = profiles?.length ?? 0;
  const totalCourses = courses?.length ?? 0;
  const totalEnrollments = enrollments?.length ?? 0;
  const totalSubmissions = submissions?.length ?? 0;
  const gradedSubmissions = submissions?.filter((s) => s.grade !== null).length ?? 0;
  const pendingGrading = totalSubmissions - gradedSubmissions;

  const roleCounts = [
    { name: "Students", value: roles?.filter((r) => r.role === "student").length ?? 0 },
    { name: "Teachers", value: roles?.filter((r) => r.role === "teacher").length ?? 0 },
    { name: "Admins", value: roles?.filter((r) => r.role === "admin").length ?? 0 },
  ];

  const courseEnrollmentData = courses?.slice(0, 8).map((c) => ({
    name: c.title.length > 15 ? c.title.slice(0, 15) + "…" : c.title,
    enrollments: enrollments?.filter((e) => e.course_id === c.id).length ?? 0,
  })) ?? [];

  const stats = [
    { label: "Total Users", value: totalUsers, icon: Users, color: "text-primary" },
    { label: "Courses", value: totalCourses, icon: BookOpen, color: "text-accent-foreground" },
    { label: "Enrollments", value: totalEnrollments, icon: GraduationCap, color: "text-primary" },
    { label: "Submissions", value: totalSubmissions, icon: FileEdit, color: "text-muted-foreground" },
    { label: "Pending Grading", value: pendingGrading, icon: Activity, color: "text-destructive" },
    { label: "Graded", value: gradedSubmissions, icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enrollments by Course</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {courseEnrollmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseEnrollmentData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} className="fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm pt-8 text-center">No courses yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Roles Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {roleCounts.some((r) => r.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                    {roleCounts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm">No user data</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
