import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-id, x-device-secret, x-nonce, x-timestamp",
};

// ============= ADAPTER LAYER =============

interface CommonAttendanceLog {
  userId: string;
  deviceId: string;
  timestamp: string;
  type: "check-in" | "check-out";
}

interface DeviceAdapter {
  name: string;
  normalize(rawData: Record<string, unknown>[]): CommonAttendanceLog[];
}

const zktecoAdapter: DeviceAdapter = {
  name: "zkteco",
  normalize(rawData) {
    return rawData.map((entry) => ({
      userId: String(entry.pin || entry.user_id || entry.PIN),
      deviceId: String(entry.sn || entry.serial_number || entry.SN),
      timestamp: new Date(String(entry.timestamp || entry.time || entry.Timestamp)).toISOString(),
      type: (Number(entry.status ?? entry.Status ?? 0) === 0 ? "check-in" : "check-out") as "check-in" | "check-out",
    }));
  },
};

const hikvisionAdapter: DeviceAdapter = {
  name: "hikvision",
  normalize(rawData) {
    return rawData.map((entry) => ({
      userId: String(entry.employeeNoString || entry.employeeNo),
      deviceId: String(entry.deviceName || entry.ipAddress),
      timestamp: new Date(String(entry.dateTime || entry.time)).toISOString(),
      type: (String(entry.eventType) === "entry" ? "check-in" : "check-out") as "check-in" | "check-out",
    }));
  },
};

const supremaAdapter: DeviceAdapter = {
  name: "suprema",
  normalize(rawData) {
    return rawData.map((entry) => ({
      userId: String(entry.user_id),
      deviceId: String(entry.device_id),
      timestamp: new Date(String(entry.datetime)).toISOString(),
      type: (Number(entry.event_type) <= 20 ? "check-in" : "check-out") as "check-in" | "check-out",
    }));
  },
};

const genericAdapter: DeviceAdapter = {
  name: "generic",
  normalize(rawData) {
    return rawData.map((entry) => ({
      userId: String(entry.userId || entry.user_id || entry.biometric_id),
      deviceId: String(entry.deviceId || entry.device_id),
      timestamp: new Date(String(entry.timestamp || entry.time || entry.datetime)).toISOString(),
      type: (String(entry.type || entry.event_type || "check-in")) as "check-in" | "check-out",
    }));
  },
};

const adapters: Record<string, DeviceAdapter> = {
  zkteco: zktecoAdapter,
  hikvision: hikvisionAdapter,
  suprema: supremaAdapter,
  anviz: genericAdapter,
  essl: genericAdapter,
  generic: genericAdapter,
};

function getAdapter(company: string): DeviceAdapter {
  return adapters[company] || adapters.generic;
}

// ============= MAIN HANDLER =============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const deviceId = req.headers.get("x-device-id");
    const deviceSecret = req.headers.get("x-device-secret");
    const nonce = req.headers.get("x-nonce");
    const timestamp = req.headers.get("x-timestamp");

    if (!deviceId || !deviceSecret) {
      return new Response(JSON.stringify({ error: "Missing device credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Replay protection: check timestamp freshness (5 min window)
    if (timestamp) {
      const requestTime = new Date(timestamp).getTime();
      const now = Date.now();
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return new Response(JSON.stringify({ error: "Request expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Replay protection: check nonce
    if (nonce) {
      const { data: existingNonce } = await supabase
        .from("webhook_nonces")
        .select("nonce")
        .eq("nonce", nonce)
        .maybeSingle();

      if (existingNonce) {
        return new Response(JSON.stringify({ error: "Duplicate request (replay)" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify device
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("*")
      .eq("device_serial", deviceId)
      .eq("is_enabled", true)
      .maybeSingle();

    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: "Device not found or disabled" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify secret key
    if (device.secret_key !== deviceSecret) {
      // Log failed attempt
      await supabase.from("audit_logs").insert({
        action: "webhook_auth_failed",
        target_table: "devices",
        target_id: device.id,
        old_data: { device_serial: deviceId },
      });
      return new Response(JSON.stringify({ error: "Invalid device secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store nonce
    if (nonce) {
      await supabase.from("webhook_nonces").insert({ nonce, device_id: device.id });
    }

    // Parse body
    const body = await req.json();
    const rawLogs = Array.isArray(body.logs) ? body.logs : [body];

    // Use adapter to normalize
    const adapter = getAdapter(device.company);
    const normalizedLogs = adapter.normalize(rawLogs);

    // Create sync log
    const { data: syncLog } = await supabase
      .from("device_sync_logs")
      .insert({
        device_id: device.id,
        sync_type: "webhook",
        status: "pending",
      })
      .select()
      .single();

    let recordsSynced = 0;
    const errors: string[] = [];

    for (const log of normalizedLogs) {
      try {
        // Find student by biometric_id
        const { data: student } = await supabase
          .from("students")
          .select("id")
          .eq("biometric_id", log.userId)
          .maybeSingle();

        if (!student) {
          errors.push(`Student not found for biometric ID: ${log.userId}`);
          continue;
        }

        const attendanceDate = new Date(log.timestamp).toISOString().split("T")[0];
        const updateField = log.type === "check-in" ? "check_in" : "check_out";

        // Upsert attendance (prevent duplicates via unique constraint)
        const { error: upsertError } = await supabase
          .from("attendance")
          .upsert(
            {
              student_id: student.id,
              device_id: device.id,
              attendance_date: attendanceDate,
              [updateField]: log.timestamp,
              status: "present",
            },
            { onConflict: "student_id,attendance_date" }
          );

        if (upsertError) {
          errors.push(`Failed for ${log.userId}: ${upsertError.message}`);
        } else {
          recordsSynced++;
        }
      } catch (e) {
        errors.push(`Error processing log: ${(e as Error).message}`);
      }
    }

    // Update sync log
    if (syncLog) {
      await supabase
        .from("device_sync_logs")
        .update({
          status: errors.length === 0 ? "success" : "failed",
          records_synced: recordsSynced,
          error_message: errors.length > 0 ? errors.join("; ") : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLog.id);
    }

    // Update device last_sync
    await supabase
      .from("devices")
      .update({ last_sync_at: new Date().toISOString(), is_online: true })
      .eq("id", device.id);

    return new Response(
      JSON.stringify({
        success: true,
        records_synced: recordsSynced,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
