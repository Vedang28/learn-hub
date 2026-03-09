import {
  LayoutDashboard, BookOpen, ClipboardCheck, Bell, User, LogOut, Video,
  PlusCircle, Users, FileEdit, GraduationCap, ShieldCheck, BarChart3
} from "lucide-react";
import logo from "@/assets/logo.jpeg";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const studentNav = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Grades", url: "/grades", icon: ClipboardCheck },
  { title: "Live Classes", url: "/live-classes", icon: Video },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

const teacherNav = [
  { title: "Dashboard", url: "/teacher", icon: LayoutDashboard },
  { title: "My Courses", url: "/teacher/courses", icon: BookOpen },
  { title: "My Students", url: "/teacher/students", icon: Users },
  { title: "Create Course", url: "/teacher/courses/new", icon: PlusCircle },
  { title: "Submissions", url: "/teacher/submissions", icon: FileEdit },
  { title: "Live Classes", url: "/teacher/live-classes", icon: Video },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

const adminNav = [
  { title: "Dashboard", url: "/admin", icon: BarChart3 },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Courses", url: "/admin/courses", icon: BookOpen },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Profile", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { isTeacher, isAdmin, isLoading } = useUserRole();
  const location = useLocation();

  const currentPortal = location.pathname.startsWith("/admin")
    ? "admin"
    : location.pathname.startsWith("/teacher")
    ? "teacher"
    : "student";

  const navItems = currentPortal === "admin" ? adminNav : currentPortal === "teacher" ? teacherNav : studentNav;
  const roleLabel = currentPortal === "admin" ? "Admin" : currentPortal === "teacher" ? "Teacher" : null;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-3">
            {!collapsed ? (
              <span className="flex items-center gap-2 text-base font-bold text-primary">
                <img src={logo} alt="Evlent Education" className="h-8 w-auto" />
                Evlent Education
              </span>
            ) : (
              <img src={logo} alt="Evlent Education" className="h-6 w-auto" />
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {!collapsed && roleLabel && (
                <div className="px-3 pb-2">
                  <Badge className={isAdmin ? "bg-destructive text-destructive-foreground text-xs" : "bg-accent text-accent-foreground text-xs"}>{roleLabel}</Badge>
                </div>
              )}
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title + item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard" || item.url === "/teacher"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick-switch links for elevated roles */}
        {(isTeacher || isAdmin) && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4">
              {!collapsed && <span className="text-xs text-muted-foreground">Switch View</span>}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/dashboard" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <GraduationCap className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Student Portal</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isTeacher && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/teacher" className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        {!collapsed && <span>Teacher Portal</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
