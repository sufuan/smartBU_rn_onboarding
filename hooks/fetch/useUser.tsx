import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

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
  const [user, setUser] = useState<UserType>();
  const [loader, setLoader] = useState(true);
  const [shouldRefetch, setShouldRefetch] = useState(false);

  const fetchUserData = useCallback(async () => {
    setLoader(true);
    try {
      await setAuthorizationHeader(); // Ensure header is set before the request
      const serverUri = process.env.EXPO_PUBLIC_SERVER_URI;
      console.log(`🌐 useUser: Attempting to connect to server at: ${serverUri}`);
      const response = await axios.get(
        `${serverUri}/me`

      );
      console.log('✅ useUser: Server response received:', response.data);

      // Ensure response.data.user exists and has the expected properties
      if (response.data && response.data.user) {
        const userData = response.data.user;
        console.log('👤 useUser: User data:', {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          stripeCustomerId: userData.stripeCustomerId,
          hasSubscription: userData.stripeCustomerId ? 'YES' : 'NO'
        });

        await SecureStore.setItemAsync("name", userData.name || ""); // Handle cases where properties might be null/undefined
        await SecureStore.setItemAsync("email", userData.email || "");
        await SecureStore.setItemAsync("avatar", userData.avatar || "");
        setUser(userData);
      } else {
        // Handle cases where user data might not be in the expected format
        console.error("❌ useUser: User data not found in response:", response.data);
        setUser(undefined); // Clear user if data is invalid
      }
    } catch (error) {
      console.error("❌ useUser: Error fetching user data:", error);
      setUser(undefined); // Clear user on error
      // If the error is 401 or 403, it might indicate an invalid/expired token
      // You might want to clear the token from SecureStore and redirect to login
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        console.log('🔐 useUser: Clearing expired token');
        await SecureStore.deleteItemAsync("accessToken");
        // Potentially redirect to login here if using expo-router, e.g., router.replace('/login');
      }
    } finally {
      setLoader(false);
    }
  }, []); // Removed shouldRefetch from here, refetch function will handle it.

  useEffect(() => {
    fetchUserData();
    // The cleanup for setShouldRefetch(false) is fine if you want to reset on unmount or if fetchUserData changes.
    // However, if refetch is the sole trigger for re-running after initial mount,
    // this useEffect's dependency array might only need fetchUserData, or even be empty if fetchUserData is stable
    // and shouldRefetch is managed purely by the refetch function.
    // For now, assuming current logic is intended.
  }, [fetchUserData, shouldRefetch]); // Re-fetch when shouldRefetch becomes true.

  const refetch = useCallback(async () => {
    console.log('🔄 useUser: Manual refetch triggered');
    await fetchUserData();
  }, [fetchUserData]);

  return { user, loader, refetch };
}