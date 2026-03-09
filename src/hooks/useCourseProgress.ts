import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useCourseProgress(courseId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: totalLessons } = useQuery({
    queryKey: ["course-total-lessons", courseId],
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId!);
      if (!modules?.length) return 0;
      const { count } = await supabase
        .from("lessons")
        .select("id", { count: "exact", head: true })
        .in("module_id", modules.map((m) => m.id));
      return count ?? 0;
    },
    enabled: !!courseId,
  });

  const { data: completedLessons } = useQuery({
    queryKey: ["course-completed-lessons", courseId, user?.id],
    queryFn: async () => {
      const { data: modules } = await supabase
        .from("modules")
        .select("id")
        .eq("course_id", courseId!);
      if (!modules?.length) return [];
      const { data: lessons } = await supabase
        .from("lessons")
        .select("id")
        .in("module_id", modules.map((m) => m.id));
      if (!lessons?.length) return [];
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("student_id", user!.id)
        .in("lesson_id", lessons.map((l) => l.id));
      return data?.map((d) => d.lesson_id) ?? [];
    },
    enabled: !!courseId && !!user,
  });

  const completedCount = completedLessons?.length ?? 0;
  const total = totalLessons ?? 0;
  const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const toggleLesson = useMutation({
    mutationFn: async (lessonId: string) => {
      const isCompleted = completedLessons?.includes(lessonId);
      if (isCompleted) {
        await supabase
          .from("lesson_progress")
          .delete()
          .eq("student_id", user!.id)
          .eq("lesson_id", lessonId);
      } else {
        await supabase
          .from("lesson_progress")
          .insert({ student_id: user!.id, lesson_id: lessonId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-completed-lessons", courseId] });
    },
  });

  return {
    completedLessons: completedLessons ?? [],
    completedCount,
    total,
    percentage,
    toggleLesson,
    isCompleted: (lessonId: string) => completedLessons?.includes(lessonId) ?? false,
  };
}
