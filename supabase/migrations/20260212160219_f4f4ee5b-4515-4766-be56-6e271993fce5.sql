
-- =============================================
-- BIOMETRIC ATTENDANCE SYSTEM - FULL SCHEMA
-- =============================================

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher');

-- 2. User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Device company enum
CREATE TYPE public.device_company AS ENUM ('zkteco', 'hikvision', 'suprema', 'anviz', 'essl', 'generic');

-- 5. Integration type enum
CREATE TYPE public.integration_type AS ENUM ('webhook', 'api_pull', 'sdk_middleware', 'csv_upload');

-- 6. Devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  device_serial TEXT NOT NULL UNIQUE,
  company device_company NOT NULL DEFAULT 'generic',
  ip_address TEXT,
  port INTEGER,
  integration integration_type NOT NULL DEFAULT 'csv_upload',
  secret_key TEXT, -- hashed secret for webhook auth
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_online BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- 7. Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_name TEXT NOT NULL UNIQUE,
  section TEXT,
  grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- 8. Students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL UNIQUE, -- enrollment number
  full_name TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  biometric_id TEXT, -- ID registered on biometric device
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- 9. Teacher-Class mapping
CREATE TABLE public.teacher_class_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, class_id)
);
ALTER TABLE public.teacher_class_mapping ENABLE ROW LEVEL SECURITY;

-- 10. Attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present', -- present, absent, late, half_day
  is_manual BOOLEAN NOT NULL DEFAULT false,
  corrected_by UUID REFERENCES auth.users(id),
  correction_reason TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT false, -- soft delete
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, attendance_date) -- prevent duplicate per day
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 11. Device sync logs
CREATE TABLE public.device_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'auto', -- auto, manual, webhook
  status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.device_sync_logs ENABLE ROW LEVEL SECURITY;

-- 12. Audit logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. Webhook replay protection
CREATE TABLE public.webhook_nonces (
  nonce TEXT PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_nonces ENABLE ROW LEVEL SECURITY;

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_attendance_student_date ON public.attendance(student_id, attendance_date);
CREATE INDEX idx_attendance_device ON public.attendance(device_id);
CREATE INDEX idx_attendance_date ON public.attendance(attendance_date);
CREATE INDEX idx_attendance_not_deleted ON public.attendance(is_deleted) WHERE is_deleted = false;
CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_biometric ON public.students(biometric_id);
CREATE INDEX idx_device_sync_device ON public.device_sync_logs(device_id);
CREATE INDEX idx_device_sync_status ON public.device_sync_logs(status);
CREATE INDEX idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_table ON public.audit_logs(target_table);
CREATE INDEX idx_teacher_class_teacher ON public.teacher_class_mapping(teacher_id);
CREATE INDEX idx_webhook_nonces_created ON public.webhook_nonces(created_at);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- =============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Check if teacher is assigned to a class
CREATE OR REPLACE FUNCTION public.is_teacher_of_class(_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teacher_class_mapping
    WHERE teacher_id = auth.uid() AND class_id = _class_id
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- user_roles policies
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- profiles policies
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- devices policies (admin only)
CREATE POLICY "Admins can manage devices" ON public.devices FOR ALL TO authenticated USING (public.is_admin());

-- classes policies
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Teachers can view assigned classes" ON public.classes FOR SELECT TO authenticated USING (public.is_teacher_of_class(id));

-- students policies
CREATE POLICY "Admins can manage students" ON public.students FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Teachers can view students in assigned classes" ON public.students FOR SELECT TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM public.teacher_class_mapping 
    WHERE teacher_id = auth.uid() AND class_id = students.class_id
  ));

-- teacher_class_mapping policies
CREATE POLICY "Admins can manage mappings" ON public.teacher_class_mapping FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Teachers can view own mappings" ON public.teacher_class_mapping FOR SELECT TO authenticated USING (teacher_id = auth.uid());

-- attendance policies
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.is_admin());
CREATE POLICY "Teachers can view attendance for assigned classes" ON public.attendance FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.teacher_class_mapping tcm ON tcm.class_id = s.class_id
    WHERE s.id = attendance.student_id AND tcm.teacher_id = auth.uid()
  ));

-- device_sync_logs policies (admin only)
CREATE POLICY "Admins can manage sync logs" ON public.device_sync_logs FOR ALL TO authenticated USING (public.is_admin());

-- audit_logs policies (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- webhook_nonces (service role only, no user access needed)
CREATE POLICY "No direct access to nonces" ON public.webhook_nonces FOR ALL TO authenticated USING (public.is_admin());
