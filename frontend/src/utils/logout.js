import { toast } from "react-toastify";

export const logout = (navigate) => {
  localStorage.removeItem("token");
  toast.success("Logged out successfully 👋");
  navigate("/login");
};
