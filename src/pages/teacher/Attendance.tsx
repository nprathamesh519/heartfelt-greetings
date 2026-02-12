import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search } from "lucide-react";

const TeacherAttendance: React.FC = () => {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAttendance = async () => {
      setLoading(true);
      // Get assigned class IDs
      const { data: mappings } = await supabase
        .from("teacher_class_mapping")
        .select("class_id")
        .eq("teacher_id", user.id);

      const classIds = mappings?.map((m) => m.class_id) || [];
      if (classIds.length === 0) { setAttendance([]); setLoading(false); return; }

      // Get student IDs in those classes
      const { data: students } = await supabase.from("students").select("id").in("class_id", classIds);
      const sIds = students?.map((s) => s.id) || [];
      if (sIds.length === 0) { setAttendance([]); setLoading(false); return; }

      const { data } = await supabase
        .from("attendance")
        .select("*, students(full_name, student_id, classes(class_name))")
        .eq("attendance_date", dateFilter)
        .in("student_id", sIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      setAttendance(data || []);
      setLoading(false);
    };
    fetchAttendance();
  }, [user, dateFilter]);

  const filtered = attendance.filter((a) =>
    !search || a.students?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = "Student ID,Name,Class,Check In,Check Out,Status\n";
    const rows = filtered.map((a) =>
      `${a.students?.student_id},${a.students?.full_name},${a.students?.classes?.class_name || ""},${a.check_in || ""},${a.check_out || ""},${a.status}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${dateFilter}.csv`;
    a.click();
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Class Attendance</h1>
            <p className="text-muted-foreground">View attendance for your assigned classes</p>
          </div>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
        <div className="flex gap-4">
          <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{a.students?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{a.students?.student_id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{a.students?.classes?.class_name || "—"}</TableCell>
                    <TableCell className="text-sm">{a.check_in ? new Date(a.check_in).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell className="text-sm">{a.check_out ? new Date(a.check_out).toLocaleTimeString() : "—"}</TableCell>
                    <TableCell><Badge variant={a.status === "present" ? "default" : "destructive"} className="capitalize">{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No attendance records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default TeacherAttendance;
