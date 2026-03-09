import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, FileEdit, Video, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: pendingSubmissions } = useQuery({
    queryKey: ["teacher-pending-submissions", user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) ?? [];
      if (!courseIds.length) return [];
      const { data } = await supabase
        .from("submissions")
        .select("*, assignments(title, course_id, courses(title))")
        .is("grade", null)
        .in("assignment_id", (
          await supabase.from("assignments").select("id").in("course_id", courseIds)
        ).data?.map((a) => a.id) ?? [])
        .order("submitted_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!courses && courses.length > 0,
  });

  const { data: totalStudents } = useQuery({
    queryKey: ["teacher-total-students", user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) ?? [];
      if (!courseIds.length) return 0;
      const { count } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .in("course_id", courseIds);
      return count ?? 0;
    },
    enabled: !!courses,
  });

  const { data: upcomingClasses } = useQuery({
    queryKey: ["teacher-upcoming-classes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .eq("teacher_id", user!.id)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isTeacher) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your courses and students</p>
        </div>
        <Button asChild>
          <Link to="/teacher/courses/new">
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{courses?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents ?? 0}</p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <FileEdit className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingSubmissions?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending Reviews</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingClasses?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Upcoming Classes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Courses</CardTitle>
            <CardDescription>Recently created</CardDescription>
          </CardHeader>
          <CardContent>
            {!courses?.length ? (
              <p className="text-sm text-muted-foreground">
                No courses yet.{" "}
                <Link to="/teacher/courses/new" className="text-primary hover:underline">Create one</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {courses.slice(0, 5).map((course) => (
                  <Link
                    key={course.id}
                    to={`/teacher/courses/${course.id}`}
                    className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                      {course.title[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{course.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{course.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Submissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Reviews</CardTitle>
            <CardDescription>Submissions awaiting grading</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingSubmissions?.length ? (
              <p className="text-sm text-muted-foreground">No pending submissions</p>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.map((sub: any) => (
                  <Link
                    key={sub.id}
                    to="/teacher/submissions"
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{sub.assignments?.title}</p>
                      <p className="text-xs text-muted-foreground">{sub.assignments?.courses?.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">Needs grading</span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
