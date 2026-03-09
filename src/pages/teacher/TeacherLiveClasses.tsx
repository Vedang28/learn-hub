import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video } from "lucide-react";
import { format } from "date-fns";
import { Navigate } from "react-router-dom";

export default function TeacherLiveClasses() {
  const { user } = useAuth();
  const { isTeacher, isLoading: roleLoading } = useUserRole();

  const { data: classes, isLoading } = useQuery({
    queryKey: ["teacher-live-classes", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("*, courses(title)")
        .eq("teacher_id", user!.id)
        .order("start_time", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  if (roleLoading) {
    return <div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }
  if (!isTeacher) return <Navigate to="/dashboard" replace />;

  const now = new Date();
  const upcoming = classes?.filter((c) => new Date(c.start_time) >= now) ?? [];
  const past = classes?.filter((c) => new Date(c.start_time) < now) ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Live Classes</h1>
        <p className="text-muted-foreground mt-1">
          Schedule classes from each course's detail page
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Upcoming</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
          ) : !upcoming.length ? (
            <p className="text-muted-foreground py-4 text-center">No upcoming classes</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((lc: any) => (
                <div key={lc.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{lc.title}</p>
                    <p className="text-xs text-muted-foreground">{lc.courses?.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(lc.start_time), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  {lc.meeting_url && (
                    <a href={lc.meeting_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                      <Video className="h-4 w-4" /> Start
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Past Classes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {past.map((lc: any) => (
                <div key={lc.id} className="flex items-center justify-between rounded-lg border p-4 opacity-60">
                  <div>
                    <p className="font-medium">{lc.title}</p>
                    <p className="text-xs text-muted-foreground">{lc.courses?.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(lc.start_time), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                  <Badge variant="secondary">Ended</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
