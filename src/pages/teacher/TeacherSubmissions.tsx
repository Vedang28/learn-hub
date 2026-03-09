import { useState } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { Loader2, FileEdit, Check, Download } from "lucide-react";
import { format } from "date-fns";

export default function TeacherSubmissions() {
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  // Get teacher's courses
  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("*").eq("teacher_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Get all assignments for teacher's courses
  const { data: assignments } = useQuery({
    queryKey: ["teacher-all-assignments", user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) ?? [];
      if (!courseIds.length) return [];
      const { data } = await supabase.from("assignments").select("*").in("course_id", courseIds);
      return data ?? [];
    },
    enabled: !!courses && courses.length > 0,
  });

  // Get all submissions
  const { data: submissions, isLoading } = useQuery({
    queryKey: ["teacher-all-submissions", user?.id, selectedCourse],
    queryFn: async () => {
      let assignmentIds = assignments?.map((a) => a.id) ?? [];
      if (selectedCourse !== "all") {
        const filtered = assignments?.filter((a) => a.course_id === selectedCourse) ?? [];
        assignmentIds = filtered.map((a) => a.id);
      }
      if (!assignmentIds.length) return [];
      const { data } = await supabase
        .from("submissions")
        .select("*, assignments(title, max_score, course_id, courses(title)), profiles:student_id(name, email)")
        .in("assignment_id", assignmentIds)
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!assignments,
  });

  const gradeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("submissions")
        .update({
          grade: parseInt(grade),
          feedback: feedback || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", gradingSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setGradingSubmission(null);
      setGrade("");
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["teacher-all-submissions"] });
      toast.success("Submission graded!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isTeacher) return <Navigate to="/dashboard" replace />;

  const ungradedCount = submissions?.filter((s) => s.grade === null).length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground mt-1">{ungradedCount} awaiting review</p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Filter by course:</Label>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !submissions?.length ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <FileEdit className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No submissions found</p>
            </div>
          ) : (
            <div className="divide-y">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                      {sub.profiles?.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{sub.profiles?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{sub.assignments?.title} · {sub.assignments?.courses?.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(sub.submitted_at), "MMM d 'at' h:mm a")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.grade !== null ? (
                      <Badge className="bg-accent text-accent-foreground">{sub.grade}/{sub.assignments?.max_score}</Badge>
                    ) : (
                      <Button size="sm" onClick={() => { setGradingSubmission(sub); setGrade(""); setFeedback(""); }}>
                        Grade
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grading Dialog */}
      <Dialog open={!!gradingSubmission} onOpenChange={(open) => { if (!open) setGradingSubmission(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
          </DialogHeader>
          {gradingSubmission && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{gradingSubmission.profiles?.name}</p>
                <p className="text-muted-foreground">{gradingSubmission.assignments?.title}</p>
              </div>

              {gradingSubmission.text_response && (
                <div className="space-y-1">
                  <Label>Student's Response</Label>
                  <div className="rounded-lg border p-3 text-sm max-h-40 overflow-auto">{gradingSubmission.text_response}</div>
                </div>
              )}

              {gradingSubmission.file_url && (
                <p className="text-sm">📎 File submitted</p>
              )}

              <div className="space-y-2">
                <Label>Grade (max {gradingSubmission.assignments?.max_score})</Label>
                <Input
                  type="number"
                  min={0}
                  max={gradingSubmission.assignments?.max_score}
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Enter score"
                />
              </div>
              <div className="space-y-2">
                <Label>Feedback (optional)</Label>
                <Textarea
                  placeholder="Write feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={() => gradeMutation.mutate()}
                disabled={!grade || gradeMutation.isPending}
                className="w-full"
              >
                {gradeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Submit Grade
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
