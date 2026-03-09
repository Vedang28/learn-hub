import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Loader2, Trash2, GripVertical, Video, FileText,
  Users, Clock, Edit2
} from "lucide-react";
import { format } from "date-fns";

export default function TeacherCourseDetail() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();

  // Course
  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("id", courseId!).single();
      return data;
    },
  });

  // Modules with lessons
  const { data: modules } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("modules")
        .select("*, lessons(*)")
        .eq("course_id", courseId!)
        .order("position");
      return data ?? [];
    },
  });

  // Assignments
  const { data: assignments } = useQuery({
    queryKey: ["course-assignments", courseId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("course_id", courseId!).order("created_at");
      return data ?? [];
    },
  });

  // Enrollments
  const { data: enrollments } = useQuery({
    queryKey: ["course-enrollments", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("enrollments")
        .select("*, profiles:student_id(name, email)")
        .eq("course_id", courseId!);
      return data ?? [];
    },
  });

  // Live classes
  const { data: liveClasses } = useQuery({
    queryKey: ["course-live-classes", courseId],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("*")
        .eq("course_id", courseId!)
        .order("start_time", { ascending: false });
      return data ?? [];
    },
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isTeacher) return <Navigate to="/dashboard" replace />;
  if (!course) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/teacher/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to courses
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
        <p className="text-muted-foreground mt-1">{course.description}</p>
      </div>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students ({enrollments?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="live">Live Classes</TabsTrigger>
        </TabsList>

        {/* Modules & Lessons Tab */}
        <TabsContent value="modules" className="space-y-4 mt-4">
          <AddModuleForm courseId={courseId!} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["modules", courseId] })} />

          {!modules?.length ? (
            <p className="text-muted-foreground py-8 text-center">No modules yet. Add one above.</p>
          ) : (
            modules.map((mod: any) => (
              <ModuleCard
                key={mod.id}
                module={mod}
                courseId={courseId!}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ["modules", courseId] })}
              />
            ))
          )}
        </TabsContent>

        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4 mt-4">
          <AddAssignmentForm courseId={courseId!} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["course-assignments", courseId] })} />

          {!assignments?.length ? (
            <p className="text-muted-foreground py-8 text-center">No assignments yet</p>
          ) : (
            assignments.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {a.deadline && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {format(new Date(a.deadline), "MMM d, yyyy")}
                        </span>
                      )}
                      <span>{a.max_score} pts</span>
                    </div>
                  </div>
                  <Link to={`/teacher/courses/${courseId}/assignments/${a.id}/submissions`}>
                    <Button variant="outline" size="sm">View Submissions</Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {!enrollments?.length ? (
                <p className="text-muted-foreground py-8 text-center">No students enrolled yet</p>
              ) : (
                <div className="divide-y">
                  {enrollments.map((enrollment: any) => (
                    <div key={enrollment.id} className="flex items-center gap-3 p-4">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {enrollment.profiles?.name?.[0]?.toUpperCase() ?? "S"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{enrollment.profiles?.name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{enrollment.profiles?.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Classes Tab */}
        <TabsContent value="live" className="space-y-4 mt-4">
          <AddLiveClassForm courseId={courseId!} teacherId={user!.id} onSuccess={() => queryClient.invalidateQueries({ queryKey: ["course-live-classes", courseId] })} />

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
                    {lc.meeting_url && <p className="text-xs text-primary mt-0.5 truncate max-w-sm">{lc.meeting_url}</p>}
                  </div>
                  <Badge variant={new Date(lc.start_time) > new Date() ? "default" : "secondary"}>
                    {new Date(lc.start_time) > new Date() ? "Upcoming" : "Past"}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-components ---

function AddModuleForm({ courseId, onSuccess }: { courseId: string; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("modules").insert({ course_id: courseId, title });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setOpen(false);
      onSuccess();
      toast.success("Module added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Module</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Module</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Module Title</Label>
            <Input placeholder="e.g., Week 1: Introduction" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Module
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModuleCard({ module, courseId, onRefresh }: { module: any; courseId: string; onRefresh: () => void }) {
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideo, setLessonVideo] = useState("");

  const addLessonMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lessons").insert({
        module_id: module.id,
        title: lessonTitle,
        content: lessonContent || null,
        video_url: lessonVideo || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLessonTitle("");
      setLessonContent("");
      setLessonVideo("");
      setAddingLesson(false);
      onRefresh();
      toast.success("Lesson added!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("modules").delete().eq("id", module.id);
      if (error) throw error;
    },
    onSuccess: () => {
      onRefresh();
      toast.success("Module deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sortedLessons = module.lessons?.sort((a: any, b: any) => a.position - b.position) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{module.title}</CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setAddingLesson(!addingLesson)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete this module and all its lessons?")) deleteModuleMutation.mutate(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedLessons.length > 0 && (
          <div className="space-y-1 mb-3">
            {sortedLessons.map((lesson: any) => (
              <div key={lesson.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                {lesson.video_url ? <Video className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="text-sm flex-1">{lesson.title}</span>
              </div>
            ))}
          </div>
        )}

        {addingLesson && (
          <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input placeholder="Lesson title" value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Content (optional, HTML supported)</Label>
              <Textarea placeholder="Lesson content..." value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Video URL (optional, embed URL)</Label>
              <Input placeholder="https://www.youtube.com/embed/..." value={lessonVideo} onChange={(e) => setLessonVideo(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => addLessonMutation.mutate()} disabled={!lessonTitle.trim() || addLessonMutation.isPending}>
                {addLessonMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Lesson
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAddingLesson(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {sortedLessons.length === 0 && !addingLesson && (
          <p className="text-sm text-muted-foreground">No lessons yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function AddAssignmentForm({ courseId, onSuccess }: { courseId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [maxScore, setMaxScore] = useState("100");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignments").insert({
        course_id: courseId,
        title,
        description: description || null,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        max_score: parseInt(maxScore) || 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDeadline("");
      setMaxScore("100");
      setOpen(false);
      onSuccess();
      toast.success("Assignment created!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Assignment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="Assignment title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Instructions for students..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deadline</Label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Score</Label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLiveClassForm({ courseId, teacherId, onSuccess }: { courseId: string; teacherId: string; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startTime, setStartTime] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("live_classes").insert({
        course_id: courseId,
        teacher_id: teacherId,
        title,
        meeting_url: meetingUrl || null,
        start_time: new Date(startTime).toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setMeetingUrl("");
      setStartTime("");
      setOpen(false);
      onSuccess();
      toast.success("Live class scheduled!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Schedule Class</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Live Class</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input placeholder="e.g., Lecture 3: Thermodynamics" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Meeting URL (Zoom, Google Meet, etc.)</Label>
            <Input placeholder="https://zoom.us/j/..." value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || !startTime || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Class
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
