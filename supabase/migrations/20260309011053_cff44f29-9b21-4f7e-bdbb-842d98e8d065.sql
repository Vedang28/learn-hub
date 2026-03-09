
-- Create lesson_progress table
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Students can view their own progress
CREATE POLICY "Students can view own progress"
  ON public.lesson_progress FOR SELECT
  USING (auth.uid() = student_id);

-- Students can mark lessons complete
CREATE POLICY "Students can insert own progress"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can remove completion
CREATE POLICY "Students can delete own progress"
  ON public.lesson_progress FOR DELETE
  USING (auth.uid() = student_id);

-- Teachers can view progress for their courses
CREATE POLICY "Teachers can view course progress"
  ON public.lesson_progress FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lessons l
    JOIN public.modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = lesson_progress.lesson_id AND c.teacher_id = auth.uid()
  ));
