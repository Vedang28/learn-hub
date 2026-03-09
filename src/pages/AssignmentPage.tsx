import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export default function AssignmentPage() {
  const { courseId, assignmentId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [textResponse, setTextResponse] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: assignment } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => {
      const { data } = await supabase.from("assignments").select("*").eq("id", assignmentId!).single();
      return data;
    },
  });

  const { data: submission } = useQuery({
    queryKey: ["submission", assignmentId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignmentId!)
        .eq("student_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      let fileUrl: string | null = null;
      if (file) {
        const filePath = `${user!.id}/${assignmentId}/${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("submissions").upload(filePath, file);
        if (uploadErr) throw uploadErr;
        fileUrl = filePath;
      }
      const { error } = await supabase.from("submissions").insert({
        assignment_id: assignmentId!,
        student_id: user!.id,
        text_response: textResponse || null,
        file_url: fileUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission", assignmentId] });
      toast.success("Assignment submitted!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!assignment) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const isPastDeadline = assignment.deadline && new Date(assignment.deadline) < new Date();

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to course
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">{assignment.title}</h1>
        <div className="flex items-center gap-3 mt-2">
          {assignment.deadline && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Due {format(new Date(assignment.deadline), "MMM d, yyyy 'at' h:mm a")}
            </span>
          )}
          <Badge variant="outline">{assignment.max_score} pts max</Badge>
        </div>
      </div>

      {assignment.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
          </CardContent>
        </Card>
      )}

      {submission ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Submission</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Submitted on {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
            {submission.text_response && (
              <div className="rounded-lg bg-muted p-3 text-sm">{submission.text_response}</div>
            )}
            {submission.file_url && (
              <p className="text-sm">📎 File attached</p>
            )}
            {submission.grade !== null && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Badge className="bg-accent text-accent-foreground text-base px-3 py-1">
                  {submission.grade}/{assignment.max_score}
                </Badge>
                {submission.feedback && (
                  <p className="text-sm text-muted-foreground">{submission.feedback}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submit Your Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPastDeadline && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                ⚠️ This assignment is past its deadline
              </div>
            )}
            <div className="space-y-2">
              <Label>Written Response (optional)</Label>
              <Textarea
                placeholder="Type your answer here..."
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                rows={5}
              />
            </div>
            <div className="space-y-2">
              <Label>File Upload (optional)</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || (!textResponse && !file)}
              className="w-full"
            >
              {submitMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Submit Assignment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
