import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Users, FileText } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";

export default function TeacherCourses() {
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();

  const { data: courses, isLoading } = useQuery({
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

  // Get enrollment counts per course
  const { data: enrollmentCounts } = useQuery({
    queryKey: ["teacher-enrollment-counts", user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) ?? [];
      if (!courseIds.length) return {};
      const { data } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", courseIds);
      const counts: Record<string, number> = {};
      data?.forEach((e) => {
        counts[e.course_id] = (counts[e.course_id] ?? 0) + 1;
      });
      return counts;
    },
    enabled: !!courses && courses.length > 0,
  });

  // Get assignment counts per course
  const { data: assignmentCounts } = useQuery({
    queryKey: ["teacher-assignment-counts", user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) ?? [];
      if (!courseIds.length) return {};
      const { data } = await supabase
        .from("assignments")
        .select("course_id")
        .in("course_id", courseIds);
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        counts[a.course_id] = (counts[a.course_id] ?? 0) + 1;
      });
      return counts;
    },
    enabled: !!courses && courses.length > 0,
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
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground mt-1">Manage your course catalog</p>
        </div>
        <Button asChild>
          <Link to="/teacher/courses/new">
            <Plus className="mr-2 h-4 w-4" /> New Course
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : !courses?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No courses created yet</p>
            <Button asChild>
              <Link to="/teacher/courses/new">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Course
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} to={`/teacher/courses/${course.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                <div className="h-28 bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-primary/40" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{course.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {enrollmentCounts?.[course.id] ?? 0} students
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {assignmentCounts?.[course.id] ?? 0} assignments
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
