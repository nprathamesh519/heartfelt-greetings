export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          corrected_by: string | null
          correction_reason: string | null
          created_at: string
          device_id: string | null
          id: string
          is_deleted: boolean
          is_manual: boolean
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          is_deleted?: boolean
          is_manual?: boolean
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          corrected_by?: string | null
          correction_reason?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          is_deleted?: boolean
          is_manual?: boolean
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          target_id: string | null
          target_table: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          target_id?: string | null
          target_table?: string
          user_id?: string | null
        }
        Relationships: []
      }
      classes: {
        Row: {
          class_name: string
          created_at: string
          grade: string | null
          id: string
          section: string | null
          updated_at: string
        }
        Insert: {
          class_name: string
          created_at?: string
          grade?: string | null
          id?: string
          section?: string | null
          updated_at?: string
        }
        Update: {
          class_name?: string
          created_at?: string
          grade?: string | null
          id?: string
          section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      device_sync_logs: {
        Row: {
          completed_at: string | null
          device_id: string
          error_message: string | null
          id: string
          records_synced: number | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          device_id: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Update: {
          completed_at?: string | null
          device_id?: string
          error_message?: string | null
          id?: string
          records_synced?: number | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_sync_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          company: Database["public"]["Enums"]["device_company"]
          created_at: string
          device_name: string
          device_serial: string
          id: string
          integration: Database["public"]["Enums"]["integration_type"]
          ip_address: string | null
          is_enabled: boolean
          is_online: boolean
          last_sync_at: string | null
          port: number | null
          secret_key: string | null
          updated_at: string
        }
        Insert: {
          company?: Database["public"]["Enums"]["device_company"]
          created_at?: string
          device_name: string
          device_serial: string
          id?: string
          integration?: Database["public"]["Enums"]["integration_type"]
          ip_address?: string | null
          is_enabled?: boolean
          is_online?: boolean
          last_sync_at?: string | null
          port?: number | null
          secret_key?: string | null
          updated_at?: string
        }
        Update: {
          company?: Database["public"]["Enums"]["device_company"]
          created_at?: string
          device_name?: string
          device_serial?: string
          id?: string
          integration?: Database["public"]["Enums"]["integration_type"]
          ip_address?: string | null
          is_enabled?: boolean
          is_online?: boolean
          last_sync_at?: string | null
          port?: number | null
          secret_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          biometric_id: string | null
          class_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          biometric_id?: string | null
          class_id?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          biometric_id?: string | null
          class_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_mapping: {
        Row: {
          class_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_mapping_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_nonces: {
        Row: {
          created_at: string
          device_id: string
          nonce: string
        }
        Insert: {
          created_at?: string
          device_id: string
          nonce: string
        }
        Update: {
          created_at?: string
          device_id?: string
          nonce?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_nonces_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_teacher_of_class: { Args: { _class_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "teacher"
      device_company:
        | "zkteco"
        | "hikvision"
        | "suprema"
        | "anviz"
        | "essl"
        | "generic"
      integration_type: "webhook" | "api_pull" | "sdk_middleware" | "csv_upload"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher"],
      device_company: [
        "zkteco",
        "hikvision",
        "suprema",
        "anviz",
        "essl",
        "generic",
      ],
      integration_type: ["webhook", "api_pull", "sdk_middleware", "csv_upload"],
    },
  },
} as const
