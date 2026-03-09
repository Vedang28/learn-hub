import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "student" | "teacher" | "admin";

export function useUserRole() {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      return (data ?? []).map((r) => r.role as AppRole);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    roles: roles ?? [],
    isTeacher: roles?.includes("teacher") ?? false,
    isAdmin: roles?.includes("admin") ?? false,
    isStudent: roles?.includes("student") ?? false,
    isLoading,
  };
}
