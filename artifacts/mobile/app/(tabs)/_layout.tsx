import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useProfile } from '@/contexts/ProfileContext';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';

let NativeBottomTabs: any = null;
let isLiquidGlassAvailable = false;
try {
  const nativeTabs = require('@bottom-tabs/react-navigation');
  if (nativeTabs?.NativeBottomTabs) {
    NativeBottomTabs = nativeTabs.NativeBottomTabs;
    isLiquidGlassAvailable = Platform.OS === 'ios';
  }
} catch { /* not installed */ }

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Feather name={name as any} size={22} color={color} />;
}

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const { selectedProfileId } = useProfile();

  // Set auth token getter so every API call carries the Clerk bearer token
  useEffect(() => {
    if (isSignedIn) {
      setAuthTokenGetter(() => getToken());
    } else {
      setAuthTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  if (!isLoaded) return null;

  // Not signed in → go to sign-in
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  // Signed in but no business selected → go to profile selector
  if (!selectedProfileId) return <Redirect href="/profile-select" />;

  const tabBarStyle = {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: insets.bottom,
    height: 56 + insets.bottom,
  };

  if (isLiquidGlassAvailable && NativeBottomTabs) {
    return (
      <NativeBottomTabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.mutedForeground }}>
        <NativeBottomTabs.Screen name="index" options={{ title: 'Home', tabBarIcon: () => 'house' }} />
        <NativeBottomTabs.Screen name="inventory" options={{ title: 'Inventory', tabBarIcon: () => 'shippingbox' }} />
        <NativeBottomTabs.Screen name="invoices" options={{ title: 'Invoices', tabBarIcon: () => 'doc.text' }} />
        <NativeBottomTabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: () => 'person.2' }} />
        <NativeBottomTabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: () => 'chart.bar' }} />
      </NativeBottomTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 10 },
        tabBarHideOnKeyboard: true,
      }}
      screenListeners={{ tabPress: () => Haptics.selectionAsync() }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <TabIcon name="home" color={color} /> }} />
      <Tabs.Screen name="inventory" options={{ title: 'Inventory', tabBarIcon: ({ color }) => <TabIcon name="package" color={color} /> }} />
      <Tabs.Screen name="invoices" options={{ title: 'Invoices', tabBarIcon: ({ color }) => <TabIcon name="file-text" color={color} /> }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', tabBarIcon: ({ color }) => <TabIcon name="users" color={color} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color }) => <TabIcon name="bar-chart-2" color={color} /> }} />
    </Tabs>
  );
}
