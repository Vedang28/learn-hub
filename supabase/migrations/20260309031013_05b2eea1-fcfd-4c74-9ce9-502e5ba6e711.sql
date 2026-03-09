
-- Table to assign students to teachers
CREATE TABLE public.teacher_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can view all teacher_students"
  ON public.teacher_students FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert teacher_students"
  ON public.teacher_students FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teacher_students"
  ON public.teacher_students FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teacher_students"
  ON public.teacher_students FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Teachers can view their own assigned students
CREATE POLICY "Teachers can view own assigned students"
  ON public.teacher_students FOR SELECT
  TO authenticated
  USING (auth.uid() = teacher_id);

-- Students can view their own assignment
CREATE POLICY "Students can view own teacher assignment"
  ON public.teacher_students FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);
