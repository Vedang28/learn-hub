import { useParams, Link, Navigate } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { format } from "date-fns";

export default function AssignmentSubmissions() {
  const { courseId, assignmentId } = useParams();
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [gradingSubmission, setGradingSubmission] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("id", assignmentId!).single();
      return data;
    },
  });

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["assignment-submissions", assignmentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, profiles:student_id(name, email)")
        .eq("assignment_id", assignmentId!)
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
  });

  const gradeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("submissions")
        .update({ grade: parseInt(grade), feedback: feedback || null, graded_at: new Date().toISOString() })
        .eq("id", gradingSubmission.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setGradingSubmission(null);
      setGrade("");
      setFeedback("");
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      toast.success("Graded!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isTeacher) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to={`/teacher/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{assignment?.title ?? "Assignment"}</h1>
        <p className="text-muted-foreground mt-1">
          {submissions?.length ?? 0} submissions · Max {assignment?.max_score} pts
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !submissions?.length ? (
            <p className="text-muted-foreground py-12 text-center">No submissions yet</p>
          ) : (
            <div className="divide-y">
              {submissions.map((sub: any) => (
                <div key={sub.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {sub.profiles?.name?.[0]?.toUpperCase() ?? "S"}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sub.profiles?.name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(sub.submitted_at), "MMM d 'at' h:mm a")}</p>
                    </div>
                  </div>
                  {sub.grade !== null ? (
                    <Badge className="bg-accent text-accent-foreground">{sub.grade}/{assignment?.max_score}</Badge>
                  ) : (
                    <Button size="sm" onClick={() => { setGradingSubmission(sub); setGrade(""); setFeedback(""); }}>
                      Grade
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!gradingSubmission} onOpenChange={(o) => { if (!o) setGradingSubmission(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grade Submission</DialogTitle></DialogHeader>
          {gradingSubmission && (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{gradingSubmission.profiles?.name}</p>
              </div>
              {gradingSubmission.text_response && (
                <div className="space-y-1">
                  <Label>Response</Label>
                  <div className="rounded-lg border p-3 text-sm max-h-40 overflow-auto">{gradingSubmission.text_response}</div>
                </div>
              )}
              {gradingSubmission.file_url && <p className="text-sm">📎 File submitted</p>}
              <div className="space-y-2">
                <Label>Grade (max {assignment?.max_score})</Label>
                <Input type="number" min={0} max={assignment?.max_score} value={grade} onChange={(e) => setGrade(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Feedback (optional)</Label>
                <Textarea placeholder="Feedback..." value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
              </div>
              <Button onClick={() => gradeMutation.mutate()} disabled={!grade || gradeMutation.isPending} className="w-full">
                {gradeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Submit Grade
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
