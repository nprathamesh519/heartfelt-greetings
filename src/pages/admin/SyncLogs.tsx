import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SyncLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("device_sync_logs")
        .select("*, devices(device_name, device_serial)")
        .order("started_at", { ascending: false })
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
          <h1 className="text-2xl font-bold">Sync Logs</h1>
          <p className="text-muted-foreground">Device synchronization history</p>
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.devices?.device_name || "—"}</TableCell>
                    <TableCell className="capitalize">{log.sync_type}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.records_synced}</TableCell>
                    <TableCell className="text-sm">{new Date(log.started_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{log.completed_at ? new Date(log.completed_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-sm text-destructive max-w-xs truncate">{log.error_message || "—"}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sync logs yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default SyncLogs;
