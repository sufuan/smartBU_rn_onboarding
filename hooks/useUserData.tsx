import { useAuth } from "@/context/auth.context";

export default function useUserData() {
  const { user } = useAuth();

  return {
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || ""
  };
}