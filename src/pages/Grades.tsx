import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Award, TrendingUp, BookOpen, BarChart3 } from "lucide-react";
import { format } from "date-fns";

function getGradeVariant(pct: number): "default" | "secondary" | "destructive" {
  if (pct >= 70) return "default";
  if (pct >= 50) return "secondary";
  return "destructive";
}

export default function Grades() {
  const { user } = useAuth();
  const [courseFilter, setCourseFilter] = useState<string>("all");

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

  const courses = useMemo(() => {
    if (!submissions) return [];
    const map = new Map<string, string>();
    submissions.forEach((s: any) => {
      const cid = s.assignments?.course_id;
      const title = s.assignments?.courses?.title;
      if (cid && title) map.set(cid, title);
    });
    return Array.from(map, ([id, title]) => ({ id, title }));
  }, [submissions]);

  const filtered = useMemo(() => {
    if (!submissions) return [];
    if (courseFilter === "all") return submissions;
    return submissions.filter((s: any) => s.assignments?.course_id === courseFilter);
  }, [submissions, courseFilter]);

  const stats = useMemo(() => {
    const graded = filtered.filter((s: any) => s.grade !== null);
    const total = graded.reduce((sum: number, s: any) => sum + (s.grade ?? 0), 0);
    const maxTotal = graded.reduce((sum: number, s: any) => sum + (s.assignments?.max_score ?? 0), 0);
    const avg = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    const highest = graded.length
      ? Math.max(...graded.map((s: any) => Math.round(((s.grade ?? 0) / (s.assignments?.max_score || 1)) * 100)))
      : 0;
    return { total: filtered.length, graded: graded.length, pending: filtered.length - graded.length, avg, highest };
  }, [filtered]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grades</h1>
          <p className="text-muted-foreground mt-1">Your complete academic transcript</p>
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Award className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.graded}</p>
              <p className="text-sm text-muted-foreground">Graded</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avg}%</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <BarChart3 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.highest}%</p>
              <p className="text-sm text-muted-foreground">Highest Score</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcript Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transcript</CardTitle>
          <CardDescription>
            {courseFilter === "all"
              ? "All submissions across courses"
              : `Showing ${courses.find((c) => c.id === courseFilter)?.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !filtered.length ? (
            <p className="text-muted-foreground py-8 text-center">No submissions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Grade</TableHead>
                    <TableHead className="w-[120px]">Score</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((sub: any) => {
                    const pct = sub.grade !== null && sub.assignments?.max_score
                      ? Math.round((sub.grade / sub.assignments.max_score) * 100)
                      : null;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium">{sub.assignments?.title}</TableCell>
                        <TableCell className="text-muted-foreground">{sub.assignments?.courses?.title}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(sub.submitted_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          {sub.grade !== null ? (
                            <Badge variant={getGradeVariant(pct!)}>
                              {sub.grade}/{sub.assignments?.max_score}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pct !== null ? (
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {sub.feedback || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
