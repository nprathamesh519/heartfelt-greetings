import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ student_id: "", full_name: "", class_id: "", biometric_id: "" });

  const fetchData = async () => {
    const [studentsRes, classesRes] = await Promise.all([
      supabase.from("students").select("*, classes(class_name)").order("full_name"),
      supabase.from("classes").select("*").order("class_name"),
    ]);
    setStudents(studentsRes.data || []);
    setClasses(classesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("students").insert({
      student_id: form.student_id,
      full_name: form.full_name,
      class_id: form.class_id || null,
      biometric_id: form.biometric_id || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Student added");
      setDialogOpen(false);
      setForm({ student_id: "", full_name: "", class_id: "", biometric_id: "" });
      fetchData();
    }
  };

  const filtered = students.filter((s) =>
    !search || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-muted-foreground">Manage student records</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Student</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Student ID</Label><Input value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required /></div>
                  <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (<SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Biometric ID</Label><Input value={form.biometric_id} onChange={(e) => setForm({ ...form, biometric_id: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">Add Student</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Biometric ID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.student_id}</TableCell>
                    <TableCell>{s.full_name}</TableCell>
                    <TableCell>{s.classes?.class_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.biometric_id || "—"}</TableCell>
                    <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No students yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default StudentManagement;
