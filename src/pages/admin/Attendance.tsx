import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";

const AdminAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAttendance = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attendance")
      .select("*, students(full_name, student_id, classes(class_name)), devices(device_name)")
      .eq("attendance_date", dateFilter)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (!error) setAttendance(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAttendance(); }, [dateFilter]);

  const filtered = attendance.filter((a) =>
    !search || a.students?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.students?.student_id?.toLowerCase().includes(search.toLowerCase())
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
            <h1 className="text-2xl font-bold">Attendance Records</h1>
            <p className="text-muted-foreground">View and manage attendance logs</p>
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
                  <TableHead>Device</TableHead>
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
                    <TableCell>
                      <Badge variant={a.status === "present" ? "default" : "destructive"} className="capitalize">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.devices?.device_name || "Manual"}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No attendance records</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default AdminAttendance;
