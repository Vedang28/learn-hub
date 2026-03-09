import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { useCourseProgress } from "@/hooks/useCourseProgress";

export default function LessonPage() {
  const { courseId, lessonId } = useParams();
  const { isCompleted, toggleLesson } = useCourseProgress(courseId);

  const { data: lesson } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data } = await supabase.from("lessons").select("*").eq("id", lessonId!).single();
      return data;
    },
  });

  const completed = lessonId ? isCompleted(lessonId) : false;

  if (!lesson) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to={`/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to course
        </Link>
        <Button
          variant={completed ? "secondary" : "default"}
          size="sm"
          onClick={() => lessonId && toggleLesson.mutate(lessonId)}
          disabled={toggleLesson.isPending}
        >
          {completed ? (
            <><CheckCircle2 className="h-4 w-4 mr-1" /> Completed</>
          ) : (
            <><Circle className="h-4 w-4 mr-1" /> Mark Complete</>
          )}
        </Button>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>

      {lesson.video_url && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-video">
              <iframe
                src={lesson.video_url}
                className="h-full w-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {lesson.content && (
        <Card>
          <CardContent className="p-6 prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
