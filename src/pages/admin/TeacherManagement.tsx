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
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedClass, setSelectedClass] = useState("");

  const fetchData = async () => {
    const [teachersRes, classesRes, mappingsRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role, profiles!inner(full_name, email)").eq("role", "teacher"),
      supabase.from("classes").select("*").order("class_name"),
      supabase.from("teacher_class_mapping").select("*, classes(class_name), profiles:teacher_id(full_name, email)"),
    ]);
    setTeachers(teachersRes.data || []);
    setClasses(classesRes.data || []);
    setMappings(mappingsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const assignClass = async () => {
    if (!selectedTeacher || !selectedClass) return;
    const { error } = await supabase.from("teacher_class_mapping").insert({
      teacher_id: selectedTeacher,
      class_id: selectedClass,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Class assigned");
      setAssignOpen(false);
      fetchData();
    }
  };

  const removeMapping = async (id: string) => {
    await supabase.from("teacher_class_mapping").delete().eq("id", id);
    toast.success("Assignment removed");
    fetchData();
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Teacher Management</h1>
            <p className="text-muted-foreground">Manage teachers and class assignments</p>
          </div>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Assign Class</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Class to Teacher</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.user_id} value={t.user_id}>
                          {(t.profiles as any)?.full_name || (t.profiles as any)?.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.class_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignClass} className="w-full">Assign</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned Class</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{(m.profiles as any)?.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{(m.profiles as any)?.email || "—"}</TableCell>
                    <TableCell>{m.classes?.class_name || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeMapping(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {mappings.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No class assignments yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default TeacherManagement;
