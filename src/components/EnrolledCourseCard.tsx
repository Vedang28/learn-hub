import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

interface EnrolledCourseCardProps {
  courseId: string;
  title: string;
  description?: string;
}

export function EnrolledCourseCard({ courseId, title, description }: EnrolledCourseCardProps) {
  const { user } = useAuth();

  const { data: progress } = useQuery({
    queryKey: ["course-progress-summary", courseId, user?.id],
    queryFn: async () => {
      // Get all modules for this course
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId);
      if (!modules?.length) return { total: 0, completed: 0, percentage: 0 };
      
      // Get all lessons for these modules
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .in("module_id", modules.map((m) => m.id));
      if (!lessons?.length) return { total: 0, completed: 0, percentage: 0 };
      
      // Get completed lessons
      const { data: completed } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", user!.id)
        .in("lesson_id", lessons.map((l) => l.id));
      
      const total = lessons.length;
      const completedCount = completed?.length ?? 0;
      const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
      
      return { total, completed: completedCount, percentage };
    },
    enabled: !!user,
  });

  return (
    <Link
      to={`/courses/${courseId}`}
      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm shrink-0">
        {title?.[0] ?? "C"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Progress value={progress?.percentage ?? 0} className="h-1.5 flex-1" />
          <span className="text-xs text-muted-foreground shrink-0">{progress?.percentage ?? 0}%</span>
        </div>
      </div>
    </Link>
  );
}
