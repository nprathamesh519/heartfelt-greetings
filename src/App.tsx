import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React, { Suspense } from "react";

// Lazy load all pages
const Auth = React.lazy(() => import("./pages/Auth"));
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
const DeviceManagement = React.lazy(() => import("./pages/admin/DeviceManagement"));
const TeacherManagement = React.lazy(() => import("./pages/admin/TeacherManagement"));
const ClassManagement = React.lazy(() => import("./pages/admin/ClassManagement"));
const StudentManagement = React.lazy(() => import("./pages/admin/StudentManagement"));
const AdminAttendance = React.lazy(() => import("./pages/admin/Attendance"));
const SyncLogs = React.lazy(() => import("./pages/admin/SyncLogs"));
const AuditLogs = React.lazy(() => import("./pages/admin/AuditLogs"));
const TeacherDashboard = React.lazy(() => import("./pages/teacher/Dashboard"));
const TeacherAttendance = React.lazy(() => import("./pages/teacher/Attendance"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const HomeRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
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
          <Suspense fallback={<LoadingSpinner />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
