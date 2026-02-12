import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import AdminDashboard from "./pages/admin/Dashboard";
import DeviceManagement from "./pages/admin/DeviceManagement";
import TeacherManagement from "./pages/admin/TeacherManagement";
import ClassManagement from "./pages/admin/ClassManagement";
import StudentManagement from "./pages/admin/StudentManagement";
import AdminAttendance from "./pages/admin/Attendance";
import SyncLogs from "./pages/admin/SyncLogs";
import AuditLogs from "./pages/admin/AuditLogs";
import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherAttendance from "./pages/teacher/Attendance";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const HomeRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "teacher") return <Navigate to="/teacher" replace />;
  return <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/auth" element={<Auth />} />
            {/* Admin routes */}
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/devices" element={<ProtectedRoute requiredRole="admin"><DeviceManagement /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute requiredRole="admin"><TeacherManagement /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute requiredRole="admin"><ClassManagement /></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute requiredRole="admin"><StudentManagement /></ProtectedRoute>} />
            <Route path="/admin/attendance" element={<ProtectedRoute requiredRole="admin"><AdminAttendance /></ProtectedRoute>} />
            <Route path="/admin/sync-logs" element={<ProtectedRoute requiredRole="admin"><SyncLogs /></ProtectedRoute>} />
            <Route path="/admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><AuditLogs /></ProtectedRoute>} />
            {/* Teacher routes */}
            <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute requiredRole="teacher"><TeacherAttendance /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
