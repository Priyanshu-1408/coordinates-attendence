import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <main className="page-shell">
        <p>Loading your account…</p>
      </main>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <Navigate to={user.role === "hr" ? "/hr" : "/employee"} replace />;
  return <Outlet />;
}
