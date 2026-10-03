import axios from "axios";
import { Navigate, Outlet } from "react-router-dom";
import { useMe } from "../api/session";

export function RequireAuth() {
  const me = useMe();
  if (me.isLoading) return <p className="p-10 text-muted">Checking your session...</p>;
  if (me.isError && axios.isAxiosError(me.error) && me.error.response?.status !== 401) {
    return <p className="p-10">Can't reach the server. Is the API running?</p>;
  }
  if (!me.data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
