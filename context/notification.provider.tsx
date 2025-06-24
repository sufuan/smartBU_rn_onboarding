import useUser, { setAuthorizationHeader } from "@/hooks/fetch/useUser";
import { registerForPushNotificationsAsync } from "@/utils/registerForPushNotificationsAsync";
import axios from "axios";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Alert } from "react-native";

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  error: Error | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    Alert.alert("useNotification must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] =
    useState<Notifications.Notification | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const { user, loader } = useUser();

  useEffect(() => {
    let isMounted = true;

    const registerPushNotification = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token && !loader && user && user.pushToken !== token) {
          await setAuthorizationHeader();
          await axios.put(
            `${process.env.EXPO_PUBLIC_SERVER_URI}/update-push-token`,
            { pushToken: token }
          );
        }
        setExpoPushToken(token);
      } catch (err: any) {
        setError(err);
      }
    };

    if (isMounted) {
      registerPushNotification();
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.courseData) {
          router.push({
            pathname: "/(routes)/course-access",
            params: {
              ...data.courseData,
              activeVideo: data.activeVideo,
            },
          });
        } else if (data?.link) {
          router.push(data.link);
        }
      }
    );

    return () => {
      isMounted = false;
      notificationListener.current?.remove(); // ✅ Replaces deprecated method
      responseListener.current?.remove();     // ✅ Replaces deprecated method
    };
  }, [loader]);

  return (
    <NotificationContext.Provider
      value={{ expoPushToken, notification, error }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
