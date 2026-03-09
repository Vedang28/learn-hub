import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardCheck, Video, Bell, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { EnrolledCourseCard } from "@/components/EnrolledCourseCard";

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("student_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: upcomingAssignments } = useQuery({
    queryKey: ["upcoming-assignments", user?.id],
    queryFn: async () => {
      const courseIds = enrollments?.map((e: any) => e.course_id) ?? [];
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("assignments")
        .select("*, courses(title)")
        .in("course_id", courseIds)
        .gte("deadline", new Date().toISOString())
        .order("deadline", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!enrollments && enrollments.length > 0,
  });

  const { data: upcomingClasses } = useQuery({
    queryKey: ["upcoming-classes", user?.id],
    queryFn: async () => {
      const courseIds = enrollments?.map((e: any) => e.course_id) ?? [];
      if (courseIds.length === 0) return [];
      const { data } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .in("course_id", courseIds)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!enrollments && enrollments.length > 0,
  });

  const { data: recentGrades } = useQuery({
    queryKey: ["recent-grades", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, assignments(title, max_score, course_id, courses(title))")
        .eq("student_id", user!.id)
        .not("grade", "is", null)
        .order("graded_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-unread", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const greeting = profile?.name ? `Welcome back, ${profile.name}!` : "Welcome back!";

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
        <p className="text-muted-foreground mt-1">Here's your learning overview</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrollments?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Enrolled Courses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <ClipboardCheck className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingAssignments?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Upcoming Assignments</p>
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
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <Bell className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notifications?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">Unread Notifications</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Enrolled Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">My Courses</CardTitle>
            <CardDescription>Your enrolled courses</CardDescription>
          </CardHeader>
          <CardContent>
            {!enrollments?.length ? (
              <p className="text-sm text-muted-foreground">
                No courses yet.{" "}
                <Link to="/courses" className="text-primary hover:underline">Browse courses</Link>
              </p>
            ) : (
              <div className="space-y-3">
                {enrollments.slice(0, 4).map((enrollment: any) => (
                  <EnrolledCourseCard
                    key={enrollment.id}
                    courseId={enrollment.course_id}
                    title={enrollment.courses?.title}
                    description={enrollment.courses?.description}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
            <CardDescription>Due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {!upcomingAssignments?.length ? (
              <p className="text-sm text-muted-foreground">No upcoming assignments</p>
            ) : (
              <div className="space-y-3">
                {upcomingAssignments.map((assignment: any) => (
                  <Link
                    key={assignment.id}
                    to={`/courses/${assignment.course_id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground">{(assignment as any).courses?.title}</p>
                    </div>
                    {assignment.deadline && (
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {format(new Date(assignment.deadline), "MMM d")}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Grades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Grades</CardTitle>
            <CardDescription>Your latest results</CardDescription>
          </CardHeader>
          <CardContent>
            {!recentGrades?.length ? (
              <p className="text-sm text-muted-foreground">No graded submissions yet</p>
            ) : (
              <div className="space-y-3">
                {recentGrades.map((sub: any) => {
                  const pct = sub.assignments?.max_score
                    ? Math.round((sub.grade / sub.assignments.max_score) * 100)
                    : 0;
                  return (
                    <div key={sub.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate text-sm">{sub.assignments?.title}</p>
                          <p className="text-xs text-muted-foreground">{sub.assignments?.courses?.title}</p>
                        </div>
                        <Badge variant={pct >= 70 ? "default" : pct >= 50 ? "secondary" : "destructive"} className="ml-2 shrink-0">
                          {sub.grade}/{sub.assignments?.max_score}
                        </Badge>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                      {sub.graded_at && (
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(sub.graded_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
