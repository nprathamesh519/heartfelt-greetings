import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import SidebarLayout from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Monitor, Wifi, WifiOff } from "lucide-react";

interface Device {
  id: string;
  device_name: string;
  device_serial: string;
  company: string;
  ip_address: string | null;
  port: number | null;
  integration: string;
  secret_key: string | null;
  is_enabled: boolean;
  is_online: boolean;
  last_sync_at: string | null;
  created_at: string;
}

const DeviceManagement: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    device_name: "",
    device_serial: "",
    company: "generic",
    ip_address: "",
    port: "80",
    integration: "csv_upload",
    secret_key: "",
  });

  const fetchDevices = async () => {
    const { data, error } = await supabase.from("devices").select("*").order("created_at", { ascending: false });
    if (!error) setDevices((data as Device[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("devices").insert({
      device_name: form.device_name,
      device_serial: form.device_serial,
      company: form.company as any,
      ip_address: form.ip_address || null,
      port: form.port ? parseInt(form.port) : null,
      integration: form.integration as any,
      secret_key: form.secret_key || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Device added");
      setDialogOpen(false);
      setForm({ device_name: "", device_serial: "", company: "generic", ip_address: "", port: "80", integration: "csv_upload", secret_key: "" });
      fetchDevices();
    }
  };

  const toggleDevice = async (id: string, enabled: boolean) => {
    await supabase.from("devices").update({ is_enabled: !enabled }).eq("id", id);
    fetchDevices();
  };

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Device Management</h1>
            <p className="text-muted-foreground">Add and manage biometric devices</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Device</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Device</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Device Name</Label>
                  <Input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value={form.device_serial} onChange={(e) => setForm({ ...form, device_serial: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Select value={form.company} onValueChange={(v) => setForm({ ...form, company: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["zkteco", "hikvision", "suprema", "anviz", "essl", "generic"].map((c) => (
                          <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Integration</Label>
                    <Select value={form.integration} onValueChange={(v) => setForm({ ...form, integration: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="webhook">Push (Webhook)</SelectItem>
                        <SelectItem value="api_pull">API Pull</SelectItem>
                        <SelectItem value="sdk_middleware">SDK Middleware</SelectItem>
                        <SelectItem value="csv_upload">CSV Upload</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.100" />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="80" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secret Key (for webhook auth)</Label>
                  <Input value={form.secret_key} onChange={(e) => setForm({ ...form, secret_key: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Add Device</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Integration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead>Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground">{device.device_serial}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{device.company}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{device.integration.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      {device.is_online ? (
                        <span className="flex items-center gap-1 text-success text-sm"><Wifi className="h-3 w-3" />Online</span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground text-sm"><WifiOff className="h-3 w-3" />Offline</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {device.last_sync_at ? new Date(device.last_sync_at).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Switch checked={device.is_enabled} onCheckedChange={() => toggleDevice(device.id, device.is_enabled)} />
                    </TableCell>
                  </TableRow>
                ))}
                {devices.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No devices added yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
};

export default DeviceManagement;
