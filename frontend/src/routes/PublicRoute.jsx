import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const token = localStorage.getItem("token");

  return token ? <Navigate to="/admin" /> : children;
}
