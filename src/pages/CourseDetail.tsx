import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, FileText, Video, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function CourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      return data;
    },
  });

  const { data: modules } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("modules").select("*, lessons(*)").eq("course_id", courseId!).order("position");
      return data ?? [];
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["course-assignments", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("course_id", courseId!).order("deadline");
      return data ?? [];
    },
  });

  const { data: liveClasses } = useQuery({
    queryKey: ["course-live-classes", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("live_classes").select("*").eq("course_id", courseId!).order("start_time");
      return data ?? [];
    },
  });

  const { data: submissions } = useQuery({
    queryKey: ["my-submissions", courseId, user?.id],
    queryFn: async () => {
      const assignmentIds = assignments?.map((a) => a.id) ?? [];
      if (assignmentIds.length === 0) return [];
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", user!.id)
        .in("assignment_id", assignmentIds);
      return data ?? [];
    },
    enabled: !!assignments && !!user,
  });

  const submissionMap = new Map(submissions?.map((s) => [s.assignment_id, s]) ?? []);

  if (!course) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-1">{course.description}</p>
      </div>

      <Tabs defaultValue="lessons">
        <TabsList>
          <TabsTrigger value="lessons">Lessons</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="live">Live Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4 mt-4">
          {!modules?.length ? (
            <p className="text-muted-foreground py-8 text-center">No lessons available yet</p>
          ) : (
            modules.map((mod: any) => (
              <Card key={mod.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{mod.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {mod.lessons?.sort((a: any, b: any) => a.position - b.position).map((lesson: any) => (
                      <Link
                        key={lesson.id}
                        to={`/courses/${courseId}/lessons/${lesson.id}`}
                        className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        {lesson.video_url ? (
                          <Video className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 text-sm">{lesson.title}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                    {(!mod.lessons || mod.lessons.length === 0) && (
                      <p className="text-sm text-muted-foreground pl-3">No lessons in this module</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3 mt-4">
          {!assignments?.length ? (
            <p className="text-muted-foreground py-8 text-center">No assignments yet</p>
          ) : (
            assignments.map((assignment) => {
              const sub = submissionMap.get(assignment.id);
              return (
                <Link
                  key={assignment.id}
                  to={`/courses/${courseId}/assignments/${assignment.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="font-medium">{assignment.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {assignment.deadline && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Due {format(new Date(assignment.deadline), "MMM d, yyyy")}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Max: {assignment.max_score} pts
                          </span>
                        </div>
                      </div>
                      {sub ? (
                        sub.grade !== null ? (
                          <Badge className="bg-accent text-accent-foreground">{sub.grade}/{assignment.max_score}</Badge>
                        ) : (
                          <Badge variant="secondary">Submitted</Badge>
                        )
                      ) : (
                        <Badge variant="outline">Not submitted</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="live" className="space-y-3 mt-4">
          {!liveClasses?.length ? (
            <p className="text-muted-foreground py-8 text-center">No live classes scheduled</p>
          ) : (
            liveClasses.map((lc) => (
              <Card key={lc.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{lc.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(lc.start_time), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {lc.meeting_url && (
                    <a
                      href={lc.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Video className="h-4 w-4" /> Join
                    </a>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
