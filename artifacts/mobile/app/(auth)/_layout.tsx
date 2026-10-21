import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { useProfile } from '@/contexts/ProfileContext';

export default function AuthLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { selectedProfileId } = useProfile();

  if (!isLoaded) return null;

  // Already signed in with profile → go to main app
  if (isSignedIn && selectedProfileId) {
    return <Redirect href="/(tabs)" />;
  }

  // Signed in but no profile → go to profile selector
  if (isSignedIn && !selectedProfileId) {
    return <Redirect href="/profile-select" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="sign-in" />
    </Stack>
  );
}
