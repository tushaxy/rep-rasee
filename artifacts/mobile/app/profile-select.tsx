import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Animated, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/expo';
import { useProfile } from '@/contexts/ProfileContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useGetBusinessProfiles, useDeleteBusinessProfile } from '@/lib/profilesApi';
import { useQueryClient } from '@tanstack/react-query';

export default function ProfileSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { user } = useUser();
  const { selectedProfileId, setSelectedProfileId } = useProfile();
  const qc = useQueryClient();

  const { data: profiles = [], isLoading } = useGetBusinessProfiles();
  const deleteProfile = useDeleteBusinessProfile();

  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSelect = (id: number) => {
    Haptics.selectionAsync();
    setSelectedProfileId(id);
    router.replace('/(tabs)');
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(`Delete "${name}"?`, 'All data for this business will be deleted permanently.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteProfile.mutateAsync({ id });
        qc.invalidateQueries();
        if (selectedProfileId === id) setSelectedProfileId(null);
      }},
    ]);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign out?', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        setSelectedProfileId(null);
        await signOut();
      }},
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={[styles.header, { paddingTop: insets.top + 20 + topPad }]}>
        <Text style={styles.headerLabel}>SELECT BUSINESS</Text>
        <Text style={styles.headerTitle}>Your Businesses</Text>
        {user && <Text style={styles.headerEmail}>{user.primaryEmailAddress?.emailAddress}</Text>}
      </LinearGradient>

      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : profiles.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="briefcase" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>No businesses yet</Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Create your first business profile to get started</Text>
            </View>
          ) : profiles.map((profile: any) => {
            const isActive = profile.id === selectedProfileId;
            return (
              <TouchableOpacity
                key={profile.id}
                style={[styles.profileCard, { backgroundColor: colors.card, borderColor: isActive ? colors.primary : colors.border, borderWidth: isActive ? 2 : 1 }]}
                onPress={() => handleSelect(profile.id)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isActive ? ['#4F46E5', '#7C3AED'] : [colors.muted, colors.muted]}
                  style={styles.profileAvatar}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Text style={[styles.profileAvatarText, { color: isActive ? '#fff' : colors.mutedForeground }]}>
                    {profile.shopName.charAt(0).toUpperCase()}
                  </Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{profile.shopName}</Text>
                  <Text style={[styles.profileOwner, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{profile.ownerName} · {profile.phone}</Text>
                  {profile.gstNumber && <Text style={[styles.profileGst, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>GST: {profile.gstNumber}</Text>}
                </View>
                {isActive && <Feather name="check-circle" size={22} color={colors.primary} />}
                {!isActive && (
                  <TouchableOpacity onPress={() => handleDelete(profile.id, profile.shopName)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Create new business */}
          <TouchableOpacity
            style={[styles.createBtn, { borderColor: colors.primary, backgroundColor: colors.overlay }]}
            onPress={() => router.push('/onboarding')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.createIconCircle}>
              <Feather name="plus" size={20} color="#fff" />
            </LinearGradient>
            <Text style={[styles.createBtnText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>Add New Business</Text>
          </TouchableOpacity>

          {/* Sign out */}
          <TouchableOpacity style={[styles.signOutBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleSignOut} activeOpacity={0.8}>
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 28 },
  headerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: '900', color: '#fff', fontFamily: 'Inter_700Bold' },
  headerEmail: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, fontFamily: 'Inter_400Regular' },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  profileAvatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, marginBottom: 2 },
  profileOwner: { fontSize: 12 },
  profileGst: { fontSize: 11, marginTop: 2 },
  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
  createIconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  createBtnText: { fontSize: 15 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 16, borderWidth: 1, marginTop: 8 },
  signOutText: { fontSize: 15 },
});
