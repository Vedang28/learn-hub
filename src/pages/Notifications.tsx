import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { format } from "date-fns";

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()}>
            <Check className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : !notifications?.length ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Bell className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 ${!notif.is_read ? "bg-primary/5" : ""}`}
                >
                  <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!notif.is_read ? "bg-primary" : "bg-transparent"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notif.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  {!notif.is_read && (
                    <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(notif.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
