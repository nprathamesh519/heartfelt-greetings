import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ class_name: "", section: "", grade: "" });

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("*, students(id)").order("class_name");
    setClasses(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert(form);
    if (error) toast.error(error.message);
    else {
      toast.success("Class added");
      setDialogOpen(false);
      setForm({ class_name: "", section: "", grade: "" });
      fetchClasses();
    }
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Classes</h1>
            <p className="text-muted-foreground">Manage classes and sections</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Class</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Class</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Class Name</Label><Input value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Section</Label><Input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Grade</Label><Input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} /></div>
                </div>
                <Button type="submit" className="w-full">Add Class</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Students</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.class_name}</TableCell>
                    <TableCell>{c.section || "—"}</TableCell>
                    <TableCell>{c.grade || "—"}</TableCell>
                    <TableCell>{c.students?.length || 0}</TableCell>
                  </TableRow>
                ))}
                {classes.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No classes yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default ClassManagement;
