import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, GraduationCap, BookOpen } from "lucide-react";

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, todayPresent: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: mappings } = await supabase
        .from("teacher_class_mapping")
        .select("class_id")
        .eq("teacher_id", user.id);

      const classIds = mappings?.map((m) => m.class_id) || [];
      if (classIds.length === 0) { setStats({ classes: 0, students: 0, todayPresent: 0 }); return; }

      const { count: studentCount } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds);

      const { data: studentIds } = await supabase
        .from("students")
        .select("id")
        .in("class_id", classIds);

      const sIds = studentIds?.map((s) => s.id) || [];
      let todayPresent = 0;
      if (sIds.length > 0) {
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("attendance_date", today)
          .in("student_id", sIds)
          .eq("is_deleted", false);
        todayPresent = count || 0;
      }

      setStats({ classes: classIds.length, students: studentCount || 0, todayPresent });
    };
    fetchStats();
  }, [user]);

  const statCards = [
    { title: "Assigned Classes", value: stats.classes, icon: BookOpen, color: "text-primary" },
    { title: "Total Students", value: stats.students, icon: GraduationCap, color: "text-accent" },
    { title: "Present Today", value: stats.todayPresent, icon: CalendarCheck, color: "text-success" },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Your class attendance overview</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
};

export default TeacherDashboard;
