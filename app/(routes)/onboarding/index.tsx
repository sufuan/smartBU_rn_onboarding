import AuthGuard from "@/components/auth/auth.guard";
import OnboardingScreen from "@/screens/onboarding/onboarding.screen";

export default function index() {
  return (
    <AuthGuard requireAuth={false}>
      <OnboardingScreen />
    </AuthGuard>
  );
}