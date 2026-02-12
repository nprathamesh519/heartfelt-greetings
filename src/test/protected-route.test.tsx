import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// Mock the AuthContext
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock Navigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
  };
});

import ProtectedRoute from "@/components/ProtectedRoute";

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("ProtectedRoute", () => {
  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    const { queryByText } = renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to /auth when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    const { getByTestId } = renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(getByTestId("navigate").getAttribute("data-to")).toBe("/auth");
  });

  it("renders children when user is authenticated and no role required", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "admin", loading: false });
    const { getByText } = renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children when user has matching required role", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "admin", loading: false });
    const { getByText } = renderWithRouter(
      <ProtectedRoute requiredRole="admin"><div>Admin Page</div></ProtectedRoute>
    );
    expect(getByText("Admin Page")).toBeInTheDocument();
  });

  it("redirects admin to /admin when accessing teacher route", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "admin", loading: false });
    const { getByTestId } = renderWithRouter(
      <ProtectedRoute requiredRole="teacher"><div>Teacher Page</div></ProtectedRoute>
    );
    expect(getByTestId("navigate").getAttribute("data-to")).toBe("/admin");
  });

  it("redirects teacher to /teacher when accessing admin route", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "teacher", loading: false });
    const { getByTestId } = renderWithRouter(
      <ProtectedRoute requiredRole="admin"><div>Admin Page</div></ProtectedRoute>
    );
    expect(getByTestId("navigate").getAttribute("data-to")).toBe("/teacher");
  });
});
