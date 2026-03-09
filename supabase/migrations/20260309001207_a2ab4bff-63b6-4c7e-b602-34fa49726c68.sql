
-- Admins can view all user_roles
CREATE POLICY "Admins can view all user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert user_roles
CREATE POLICY "Admins can insert user_roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can update user_roles
CREATE POLICY "Admins can update user_roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can delete user_roles
CREATE POLICY "Admins can delete user_roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all enrollments
CREATE POLICY "Admins can view all enrollments"
ON public.enrollments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
ON public.submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete courses
CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update courses
CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
