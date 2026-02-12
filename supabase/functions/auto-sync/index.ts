import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Get all enabled API pull devices
    const { data: devices, error: devicesError } = await supabase
      .from("devices")
      .select("*")
      .eq("integration", "api_pull")
      .eq("is_enabled", true);

    if (devicesError || !devices?.length) {
      return new Response(
        JSON.stringify({ message: "No API pull devices found", error: devicesError?.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Record<string, unknown>[] = [];

    for (const device of devices) {
      // Create sync log entry
      const { data: syncLog } = await supabase
        .from("device_sync_logs")
        .insert({
          device_id: device.id,
          sync_type: "auto",
          status: "pending",
        })
        .select()
        .single();

      let retries = 3;
      let success = false;
      let lastError = "";

      while (retries > 0 && !success) {
        try {
          // Attempt to fetch logs from device API
          const deviceUrl = `http://${device.ip_address}:${device.port}/api/attendance/logs`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(deviceUrl, {
            signal: controller.signal,
            headers: { "X-Device-Key": device.secret_key || "" },
          });
          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Device returned ${response.status}`);
          }

          const data = await response.json();
          const logs = Array.isArray(data.logs) ? data.logs : Array.isArray(data) ? data : [];

          let recordsSynced = 0;

          for (const log of logs) {
            const biometricId = String(log.userId || log.user_id || log.pin || log.biometric_id);
            const { data: student } = await supabase
              .from("students")
              .select("id")
              .eq("biometric_id", biometricId)
              .maybeSingle();

            if (!student) continue;

            const ts = new Date(String(log.timestamp || log.time || log.datetime));
            const attendanceDate = ts.toISOString().split("T")[0];
            const type = String(log.type || log.event_type || "check-in");
            const field = type === "check-out" ? "check_out" : "check_in";

            const { error } = await supabase
              .from("attendance")
              .upsert(
                {
                  student_id: student.id,
                  device_id: device.id,
                  attendance_date: attendanceDate,
                  [field]: ts.toISOString(),
                  status: "present",
                },
                { onConflict: "student_id,attendance_date" }
              );

            if (!error) recordsSynced++;
          }

          // Update sync log
          if (syncLog) {
            await supabase
              .from("device_sync_logs")
              .update({
                status: "success",
                records_synced: recordsSynced,
                completed_at: new Date().toISOString(),
              })
              .eq("id", syncLog.id);
          }

          await supabase
            .from("devices")
            .update({ last_sync_at: new Date().toISOString(), is_online: true })
            .eq("id", device.id);

          success = true;
          results.push({ device: device.device_name, status: "success", records: recordsSynced });
        } catch (e) {
          lastError = (e as Error).message;
          retries--;
          if (retries > 0) await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (!success) {
        if (syncLog) {
          await supabase
            .from("device_sync_logs")
            .update({
              status: "failed",
              error_message: lastError,
              completed_at: new Date().toISOString(),
            })
            .eq("id", syncLog.id);
        }
        await supabase.from("devices").update({ is_online: false }).eq("id", device.id);
        results.push({ device: device.device_name, status: "failed", error: lastError });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
