import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*, profiles:user_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">System activity trail</p>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{(log.profiles as any)?.full_name || "System"}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">{log.target_table}</TableCell>
                    <TableCell className="text-sm">{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No audit logs yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default AuditLogs;
