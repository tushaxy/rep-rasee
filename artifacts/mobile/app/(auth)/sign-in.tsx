import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Platform, KeyboardAvoidingView, ScrollView,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSSO, useSignIn, useSignUp } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const useWarmUpBrowser = () => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
};

type AuthMode = 'landing' | 'email-signin' | 'email-signup';

export default function SignInScreen() {
  useWarmUpBrowser();
  const insets = useSafeAreaInsets();
  const { startSSOFlow } = useSSO();
  const { signIn, errors: signInErrors, fetchStatus: signInFetch } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpFetch } = useSignUp();

  const [mode, setMode] = useState<AuthMode>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [loading, setLoading] = useState(false);

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(cardAnim, { toValue: 0, tension: 80, friction: 9, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const handleOAuth = useCallback(async (strategy: 'oauth_google' | 'oauth_apple') => {
    try {
      setLoading(true);
      Haptics.selectionAsync();
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'raseed' }),
      });
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => { /* handled by auth layout redirect */ },
        });
      }
    } catch (err: any) {
      Alert.alert('Sign-in failed', err?.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [startSSOFlow]);

  const handleEmailSignIn = async () => {
    if (!email || !password) return;
    Haptics.selectionAsync();
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) { Alert.alert('Error', error.message ?? 'Sign in failed'); return; }
    if (signIn.status === 'complete') {
      await signIn.finalize({ navigate: async () => {} });
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) return;
    Haptics.selectionAsync();
    const { error } = await signUp.password({ emailAddress: email, password, firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' ') || undefined });
    if (error) { Alert.alert('Error', error.message ?? 'Sign up failed'); return; }
    await signUp.verifications.sendEmailCode();
    setShowVerify(true);
  };

  const handleVerify = async () => {
    Haptics.selectionAsync();
    await signUp.verifications.verifyEmailCode({ code: verifyCode });
    if (signUp.status === 'complete') {
      await signUp.finalize({ navigate: async () => {} });
    }
  };

  const isBusy = loading || signInFetch === 'fetching' || signUpFetch === 'fetching';

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient
        colors={['#080812', '#0D0D1F', '#12102A']}
        style={StyleSheet.absoluteFill}
      />
      {/* Glow orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <Animated.View style={[styles.logoBlock, { opacity: logoAnim, transform: [{ scale: logoAnim }] }]}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.logoCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.logoLetter}>₹</Text>
            </LinearGradient>
            <Text style={styles.appName}>RASEED</Text>
            <Text style={styles.appNameHindi}>रसीद</Text>
            <Text style={styles.tagline}>Smart Invoicing & Inventory</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ translateY: cardAnim }] }]}>

            {/* Verify email */}
            {showVerify ? (
              <View style={styles.section}>
                <Text style={styles.cardTitle}>Verify your email</Text>
                <Text style={styles.cardSub}>Enter the code sent to {email}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit code"
                  placeholderTextColor="#4A4A6A"
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="numeric"
                  textAlign="center"
                  letterSpacing={8}
                  autoFocus
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerify} disabled={isBusy} activeOpacity={0.85}>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Continue</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowVerify(false)} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </TouchableOpacity>
              </View>
            ) : mode === 'landing' ? (
              <>
                <Text style={styles.cardTitle}>Welcome back</Text>
                <Text style={styles.cardSub}>Sign in to manage your business</Text>

                {/* Google */}
                <TouchableOpacity style={styles.socialBtn} onPress={() => handleOAuth('oauth_google')} disabled={isBusy} activeOpacity={0.8}>
                  {isBusy && loading ? <ActivityIndicator color="#4285F4" size="small" /> : (
                    <>
                      <View style={styles.googleIcon}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#4285F4' }}>G</Text>
                      </View>
                      <Text style={styles.socialBtnText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Apple */}
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]} onPress={() => handleOAuth('oauth_apple')} disabled={isBusy} activeOpacity={0.8}>
                    <Feather name="apple" size={18} color="#fff" />
                    <Text style={[styles.socialBtnText, { color: '#fff' }]}>Continue with Apple</Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Email options */}
                <TouchableOpacity style={[styles.socialBtn, styles.emailBtn]} onPress={() => setMode('email-signin')} activeOpacity={0.8}>
                  <Feather name="mail" size={18} color="#818CF8" />
                  <Text style={[styles.socialBtnText, { color: '#818CF8' }]}>Sign in with Email</Text>
                </TouchableOpacity>

                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>New to Raseed? </Text>
                  <TouchableOpacity onPress={() => setMode('email-signup')}>
                    <Text style={styles.switchLink}>Create account</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : mode === 'email-signin' ? (
              <View style={styles.section}>
                <Text style={styles.cardTitle}>Sign in</Text>
                <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#4A4A6A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoFocus />
                {signInErrors?.fields?.identifier && <Text style={styles.errText}>{signInErrors.fields.identifier.message}</Text>}
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#4A4A6A" value={password} onChangeText={setPassword} secureTextEntry />
                {signInErrors?.fields?.password && <Text style={styles.errText}>{signInErrors.fields.password.message}</Text>}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailSignIn} disabled={isBusy || !email || !password} activeOpacity={0.85}>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('landing')} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.cardTitle}>Create account</Text>
                <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#4A4A6A" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
                <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#4A4A6A" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                {signUpErrors?.fields?.emailAddress && <Text style={styles.errText}>{signUpErrors.fields.emailAddress.message}</Text>}
                <TextInput style={styles.input} placeholder="Password (min 8 chars)" placeholderTextColor="#4A4A6A" value={password} onChangeText={setPassword} secureTextEntry />
                {signUpErrors?.fields?.password && <Text style={styles.errText}>{signUpErrors.fields.password.message}</Text>}
                <TouchableOpacity style={styles.primaryBtn} onPress={handleEmailSignUp} disabled={isBusy || !email || !password} activeOpacity={0.85}>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.primaryBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {isBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
                  </LinearGradient>
                </TouchableOpacity>
                {/* Required by Clerk for bot protection */}
                <View nativeID="clerk-captcha" />
                <TouchableOpacity onPress={() => setMode('landing')} style={styles.backLink}>
                  <Text style={styles.backLinkText}>← Back</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          <Text style={styles.legalText}>By continuing you agree to our Terms of Service</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080812' },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.12 },
  orb1: { width: 320, height: 320, backgroundColor: '#4F46E5', top: -80, left: -60 },
  orb2: { width: 240, height: 240, backgroundColor: '#7C3AED', bottom: 40, right: -60 },
  scroll: { alignItems: 'center', paddingHorizontal: 24 },
  logoBlock: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16 },
  logoLetter: { fontSize: 40, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: 6, fontFamily: 'Inter_700Bold' },
  appNameHindi: { fontSize: 18, color: '#818CF8', fontWeight: '600', marginTop: 2, letterSpacing: 2, fontFamily: 'Inter_500Medium' },
  tagline: { fontSize: 13, color: '#4A4A7A', marginTop: 6, fontFamily: 'Inter_400Regular', letterSpacing: 0.5 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#0F0F20', borderRadius: 28, padding: 28, borderWidth: 1, borderColor: '#1E1E3A', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', marginBottom: 4, fontFamily: 'Inter_700Bold' },
  cardSub: { fontSize: 13, color: '#64748B', marginBottom: 24, fontFamily: 'Inter_400Regular' },
  section: { width: '100%' },
  socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1A1A2E', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A4A' },
  appleBtn: { backgroundColor: '#1C1C1E', borderColor: '#3A3A3A' },
  emailBtn: { borderColor: '#2D2D5A' },
  googleIcon: { width: 22, height: 22, borderRadius: 4, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: '#E2E8F0', fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1E1E3A' },
  dividerText: { color: '#4A4A6A', fontSize: 12, fontFamily: 'Inter_400Regular' },
  input: { backgroundColor: '#13132A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: '#F1F5F9', fontSize: 15, borderWidth: 1, borderColor: '#2A2A4A', marginBottom: 12, fontFamily: 'Inter_400Regular' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16 },
  primaryBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: '#64748B', fontSize: 13, fontFamily: 'Inter_400Regular' },
  switchLink: { color: '#818CF8', fontSize: 13, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  errText: { color: '#F87171', fontSize: 12, marginBottom: 8, fontFamily: 'Inter_400Regular' },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { color: '#818CF8', fontSize: 13, fontFamily: 'Inter_500Medium' },
  legalText: { fontSize: 11, color: '#2A2A4A', marginTop: 24, textAlign: 'center', fontFamily: 'Inter_400Regular' },
});
