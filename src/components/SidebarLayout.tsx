import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Monitor, Users, GraduationCap, CalendarCheck,
  History, FileBarChart, Settings, LogOut, Fingerprint, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const adminLinks = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/devices", icon: Monitor, label: "Devices" },
  { to: "/admin/teachers", icon: Users, label: "Teachers" },
  { to: "/admin/classes", icon: BookOpen, label: "Classes" },
  { to: "/admin/students", icon: GraduationCap, label: "Students" },
  { to: "/admin/attendance", icon: CalendarCheck, label: "Attendance" },
  { to: "/admin/sync-logs", icon: History, label: "Sync Logs" },
  { to: "/admin/audit-logs", icon: FileBarChart, label: "Audit Logs" },
];

const teacherLinks = [
  { to: "/teacher", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/teacher/attendance", icon: CalendarCheck, label: "Attendance" },
];

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const { role, signOut, user } = useAuth();
  const location = useLocation();
  const links = role === "admin" ? adminLinks : teacherLinks;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Fingerprint className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold">BioAttend</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{role} Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-4 space-y-2">
          <p className="px-3 text-xs text-sidebar-foreground/50 truncate">{user?.email}</p>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default SidebarLayout;
