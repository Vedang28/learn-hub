import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Grades() {
  const { user } = useAuth();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ["all-submissions", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("submissions")
        .select("*, assignments(title, max_score, course_id, courses(title))")
        .eq("student_id", user!.id)
        .order("submitted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Grades</h1>
        <p className="text-muted-foreground mt-1">Track your performance across all courses</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !submissions?.length ? (
            <p className="text-muted-foreground py-8 text-center">No submissions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Grade</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub: any) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.assignments?.title}</TableCell>
                    <TableCell className="text-muted-foreground">{sub.assignments?.courses?.title}</TableCell>
                    <TableCell className="text-right">
                      {sub.grade !== null ? (
                        <Badge className="bg-accent text-accent-foreground">
                          {sub.grade}/{sub.assignments?.max_score}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {sub.feedback || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
