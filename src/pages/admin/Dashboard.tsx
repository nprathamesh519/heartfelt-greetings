import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Monitor, CalendarCheck, GraduationCap, TrendingUp, TrendingDown } from "lucide-react";
import SidebarLayout from "@/components/SidebarLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(215, 80%, 52%)", "hsl(168, 60%, 44%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)"];

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalDevices: 0,
    onlineDevices: 0,
    todayPresent: 0,
    todayAbsent: 0,
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; present: number; absent: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [students, teachers, devices, todayAttendance] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("devices").select("id, is_online"),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("is_deleted", false),
      ]);

      const devicesData = devices.data || [];
      const totalStudents = students.count || 0;
      const todayPresent = todayAttendance.count || 0;

      setStats({
        totalStudents,
        totalTeachers: teachers.count || 0,
        totalDevices: devicesData.length,
        onlineDevices: devicesData.filter((d) => d.is_online).length,
        todayPresent,
        todayAbsent: Math.max(0, totalStudents - todayPresent),
      });

      // Weekly attendance data
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const weekData: typeof weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("attendance_date", dateStr)
          .eq("is_deleted", false);
        weekData.push({
          day: days[date.getDay()],
          present: count || 0,
          absent: Math.max(0, totalStudents - (count || 0)),
        });
      }
      setWeeklyData(weekData);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const pieData = [
    { name: "Present", value: stats.todayPresent },
    { name: "Absent", value: stats.todayAbsent },
  ];

  const statCards = [
    { title: "Total Students", value: stats.totalStudents, icon: GraduationCap, color: "text-primary" },
    { title: "Total Teachers", value: stats.totalTeachers, icon: Users, color: "text-accent" },
    { title: "Devices Online", value: `${stats.onlineDevices}/${stats.totalDevices}`, icon: Monitor, color: "text-success" },
    { title: "Present Today", value: stats.todayPresent, icon: CalendarCheck, color: "text-warning" },
  ];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Overview of attendance and system status</p>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 90%)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="present" fill="hsl(215, 80%, 52%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today's Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
};

export default AdminDashboard;
