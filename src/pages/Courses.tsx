import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, Plus, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";

export default function Courses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: allCourses, isLoading } = useQuery({
    queryKey: ["all-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: enrollments } = useQuery({
    queryKey: ["enrollments", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("course_id").eq("student_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const enrolledIds = new Set(enrollments?.map((e) => e.course_id) ?? []);

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from("enrollments").insert({ student_id: user!.id, course_id: courseId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      toast.success("Enrolled successfully!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = allCourses?.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="text-muted-foreground mt-1">Browse and enroll in courses</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-muted-foreground">No courses available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => {
            const isEnrolled = enrolledIds.has(course.id);
            return (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-primary/40" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">
                    <Link to={`/courses/${course.id}`} className="hover:text-primary transition-colors">
                      {course.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">{course.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEnrolled ? (
                    <Button variant="secondary" className="w-full" asChild>
                      <Link to={`/courses/${course.id}`}>
                        <Check className="mr-2 h-4 w-4" /> Continue Learning
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => enrollMutation.mutate(course.id)}
                      disabled={enrollMutation.isPending}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Enroll
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
