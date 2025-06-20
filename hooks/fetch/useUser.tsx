import { useUserQuery } from "@/hooks/queries/useUserQuery";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useCallback } from "react";

// UserType should be globally available from configs/global.d.ts

export const setAuthorizationHeader = async () => {
  const token = await SecureStore.getItemAsync("accessToken");
  if (token) {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    // It's good practice to delete the header if the token is not available
    delete axios.defaults.headers.common["Authorization"];
  }
};

interface UseUserReturn {
  user: UserType | undefined;
  loader: boolean;
  refetch: () => Promise<void>;
}

export default function useUser(): UseUserReturn {
  const { user, isLoading, refetch: queryRefetch } = useUserQuery();

  const refetch = useCallback(async () => {
    console.log('🔄 useUser: Manual refetch triggered (TanStack Query)');
    await queryRefetch();
  }, [queryRefetch]);

  return {
    user,
    loader: isLoading,
    refetch
  };
}