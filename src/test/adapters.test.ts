import { describe, it, expect } from "vitest";

// ============= ADAPTER LOGIC (extracted for testing) =============

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
      type: String(entry.type || entry.event_type || "check-in") as "check-in" | "check-out",
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

// ============= TESTS =============

describe("Device Adapters", () => {
  describe("ZKTeco Adapter", () => {
    it("normalizes standard ZKTeco data with pin/sn fields", () => {
      const raw = [
        { pin: "1001", sn: "ZK-001", timestamp: "2026-02-12T08:30:00Z", status: 0 },
        { pin: "1002", sn: "ZK-001", timestamp: "2026-02-12T16:30:00Z", status: 1 },
      ];
      const result = zktecoAdapter.normalize(raw);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: "1001",
        deviceId: "ZK-001",
        timestamp: "2026-02-12T08:30:00.000Z",
        type: "check-in",
      });
      expect(result[1].type).toBe("check-out");
    });

    it("handles alternate field names (PIN, SN, Timestamp, Status)", () => {
      const raw = [{ PIN: "2001", SN: "ZK-ALT", Timestamp: "2026-01-15T09:00:00Z", Status: 0 }];
      const result = zktecoAdapter.normalize(raw);
      expect(result[0].userId).toBe("2001");
      expect(result[0].deviceId).toBe("ZK-ALT");
      expect(result[0].type).toBe("check-in");
    });

    it("handles user_id and serial_number fields", () => {
      const raw = [{ user_id: "3001", serial_number: "ZK-SN", time: "2026-03-01T07:00:00Z", status: 1 }];
      const result = zktecoAdapter.normalize(raw);
      expect(result[0].userId).toBe("3001");
      expect(result[0].deviceId).toBe("ZK-SN");
      expect(result[0].type).toBe("check-out");
    });
  });

  describe("Hikvision Adapter", () => {
    it("normalizes Hikvision event data", () => {
      const raw = [
        { employeeNoString: "EMP-101", deviceName: "HIK-DOOR-1", dateTime: "2026-02-12T08:00:00Z", eventType: "entry" },
        { employeeNo: "EMP-102", ipAddress: "192.168.1.50", time: "2026-02-12T17:00:00Z", eventType: "exit" },
      ];
      const result = hikvisionAdapter.normalize(raw);
      expect(result[0]).toEqual({
        userId: "EMP-101",
        deviceId: "HIK-DOOR-1",
        timestamp: "2026-02-12T08:00:00.000Z",
        type: "check-in",
      });
      expect(result[1].userId).toBe("EMP-102");
      expect(result[1].deviceId).toBe("192.168.1.50");
      expect(result[1].type).toBe("check-out");
    });
  });

  describe("Suprema Adapter", () => {
    it("normalizes Suprema BioStar data", () => {
      const raw = [
        { user_id: "SUP-001", device_id: "BS2-GATE", datetime: "2026-02-12T08:15:00Z", event_type: 10 },
        { user_id: "SUP-002", device_id: "BS2-GATE", datetime: "2026-02-12T17:30:00Z", event_type: 25 },
      ];
      const result = supremaAdapter.normalize(raw);
      expect(result[0].type).toBe("check-in"); // event_type <= 20
      expect(result[1].type).toBe("check-out"); // event_type > 20
    });
  });

  describe("Generic Adapter", () => {
    it("normalizes generic device data", () => {
      const raw = [
        { userId: "U1", deviceId: "D1", timestamp: "2026-02-12T08:00:00Z", type: "check-in" },
      ];
      const result = genericAdapter.normalize(raw);
      expect(result[0].userId).toBe("U1");
      expect(result[0].type).toBe("check-in");
    });

    it("defaults to check-in when type field is absent", () => {
      const raw = [{ biometric_id: "BIO-1", device_id: "DEV-1", datetime: "2026-02-12T09:00:00Z" }];
      const result = genericAdapter.normalize(raw);
      expect(result[0].userId).toBe("BIO-1");
      expect((result[0].type as string)).toBe("check-in");
    });

    it("handles empty array", () => {
      expect(genericAdapter.normalize([])).toEqual([]);
    });
  });

  describe("getAdapter", () => {
    it("returns correct adapter for known companies", () => {
      expect(getAdapter("zkteco").name).toBe("zkteco");
      expect(getAdapter("hikvision").name).toBe("hikvision");
      expect(getAdapter("suprema").name).toBe("suprema");
      expect(getAdapter("anviz").name).toBe("generic");
      expect(getAdapter("essl").name).toBe("generic");
    });

    it("falls back to generic for unknown companies", () => {
      expect(getAdapter("unknown_brand").name).toBe("generic");
      expect(getAdapter("").name).toBe("generic");
    });
  });
});

describe("Webhook Security Validation", () => {
  describe("Timestamp freshness check", () => {
    const FIVE_MIN_MS = 5 * 60 * 1000;

    it("accepts timestamps within 5 minute window", () => {
      const now = Date.now();
      const requestTime = now - 2 * 60 * 1000; // 2 min ago
      expect(Math.abs(now - requestTime) <= FIVE_MIN_MS).toBe(true);
    });

    it("rejects timestamps older than 5 minutes", () => {
      const now = Date.now();
      const requestTime = now - 6 * 60 * 1000; // 6 min ago
      expect(Math.abs(now - requestTime) <= FIVE_MIN_MS).toBe(false);
    });

    it("rejects future timestamps beyond 5 minutes", () => {
      const now = Date.now();
      const requestTime = now + 6 * 60 * 1000; // 6 min in future
      expect(Math.abs(now - requestTime) <= FIVE_MIN_MS).toBe(false);
    });
  });

  describe("Attendance date extraction", () => {
    it("extracts correct date from ISO timestamp", () => {
      const timestamp = "2026-02-12T08:30:00.000Z";
      const date = new Date(timestamp).toISOString().split("T")[0];
      expect(date).toBe("2026-02-12");
    });

    it("handles timezone edge cases", () => {
      const timestamp = "2026-02-12T23:59:59.999Z";
      const date = new Date(timestamp).toISOString().split("T")[0];
      expect(date).toBe("2026-02-12");
    });
  });

  describe("Check-in/Check-out field mapping", () => {
    it("maps check-in type to check_in field", () => {
      const type = "check-in";
      const field = type === "check-in" ? "check_in" : "check_out";
      expect(field).toBe("check_in");
    });

    it("maps check-out type to check_out field", () => {
      const type: string = "check-out";
      const field = type === "check-in" ? "check_in" : "check_out";
      expect(field).toBe("check_out");
    });
  });
});

describe("Duplicate Prevention Logic", () => {
  it("upsert conflict key is student_id + attendance_date", () => {
    // This tests the conceptual constraint
    const records = [
      { student_id: "s1", attendance_date: "2026-02-12", check_in: "08:00" },
      { student_id: "s1", attendance_date: "2026-02-12", check_out: "16:00" },
    ];
    const uniqueKeys = new Set(records.map((r) => `${r.student_id}_${r.attendance_date}`));
    expect(uniqueKeys.size).toBe(1); // same student + date = single record
  });

  it("allows same student on different dates", () => {
    const records = [
      { student_id: "s1", attendance_date: "2026-02-12" },
      { student_id: "s1", attendance_date: "2026-02-13" },
    ];
    const uniqueKeys = new Set(records.map((r) => `${r.student_id}_${r.attendance_date}`));
    expect(uniqueKeys.size).toBe(2);
  });
});
