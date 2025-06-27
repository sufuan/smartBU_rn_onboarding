import AuthGuard from "@/components/auth/auth.guard";
import AuthScreen from "@/screens/auth/auth.screen";
import React from "react";

export default function AuthIndex() {
  return (
    <AuthGuard requireAuth={false}>
      <AuthScreen />
    </AuthGuard>
  );
}
