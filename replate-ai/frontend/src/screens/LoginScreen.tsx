import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { RootStackParamList } from "../navigation/AppNavigator";
import { signIn, saveSession } from "../services/api";
import { EMAIL_REGEX } from "../utils/validation";
import { authStyles } from "../styles/authStyles";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const BG = "#FAFAF8";
const CARD_BG = "#FFFFFF";
const TEXT_DARK = "#1A1A1A";
const TEXT_SECONDARY = "#555555";
const TEXT_MUTED = "#999999";
const BORDER = "#E0E0DE";
const INPUT_BG = "#F5F5F3";
const ACCENT = "#D4A017";

function mapSignInError(error: string): string {
  if (error.toLowerCase().includes("invalid email or password")) {
    return "Incorrect email or password. Please try again.";
  }
  if (error.toLowerCase().includes("too many attempts")) {
    return "Too many failed attempts. Please wait a few minutes and try again.";
  }
  if (error.toLowerCase().includes("disabled")) {
    return "This account has been disabled. Please contact support.";
  }
  return "Sign in failed. Please check your credentials and try again.";
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");

  // Animation values
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.5)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  async function handleGoogleSignIn() {
    // Expo Go doesn't support native Google auth
    // Need to build a development build for full Google sign-in support
    Alert.alert(
      "Google Sign In",
      "Google sign-in will be available after app build.\n\nPlease use email login for now.",
      [{ text: "OK" }]
    );
  }

  useEffect(() => {
    // Logo animation - scale up and fade in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Form animation - slide up from bottom after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(formTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
  }, []);

  function validate(): boolean {
    let valid = true;

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    } else {
      setPasswordError("");
    }

    return valid;
  }

  async function handleSignIn() {
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signIn({ email: email.trim(), password });
      if (result.success && result.idToken && result.refreshToken) {
        await saveSession(result.idToken, result.refreshToken, result.displayName || email.split("@")[0]);
        navigation.replace("Home");
      } else {
        setFormError(mapSignInError(result.error || ""));
      }
    } catch (err) {
      console.error("[LoginScreen] signIn error:", err);
      setFormError("Could not connect to the server. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Food Imagery Section */}
          <Animated.View
            style={[
              styles.heroSection,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <View style={styles.brandMark}>
              <View style={styles.brandIconRing}>
                <MaterialCommunityIcons name="leaf" size={52} color={ACCENT} />
              </View>
            </View>
            <Text style={styles.logoText}>ReplateAI</Text>
            <Text style={styles.tagline}>Turn leftovers into delicious meals</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: formOpacity,
                transform: [{ translateY: formTranslateY }],
              },
            ]}
          >
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>

            {formError ? (
              <View style={authStyles.formErrorBox}>
                <Text style={authStyles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <TextInput
              style={[styles.input, emailError ? authStyles.inputError : null]}
              placeholder="Email address"
              placeholderTextColor={TEXT_MUTED}
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError("");
                if (formError) setFormError("");
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
            {emailError ? <Text style={authStyles.fieldError}>{emailError}</Text> : null}

            <TextInput
              style={[styles.input, passwordError ? authStyles.inputError : null]}
              placeholder="Password"
              placeholderTextColor={TEXT_MUTED}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError("");
                if (formError) setFormError("");
              }}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignIn}
            />
            {passwordError ? <Text style={authStyles.fieldError}>{passwordError}</Text> : null}

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate("ForgotPassword")}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInButton, loading && styles.signInButtonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
            >
              {(
                <>
                  <Ionicons name="logo-google" size={20} color={TEXT_DARK} />
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.link}>
                Don't have an account?{" "}
                <Text style={styles.linkBold}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 32,
  },
  brandMark: {
    marginBottom: 24,
    alignItems: "center",
  },
  brandIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFF8E7",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 36,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: CARD_BG,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 28,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: TEXT_MUTED,
    marginBottom: 24,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: ACCENT,
    fontWeight: "500",
  },
  signInButton: {
    backgroundColor: TEXT_DARK,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  signInButtonDisabled: {
    backgroundColor: "#888888",
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "500",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 24,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_DARK,
  },
  link: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  linkBold: {
    color: TEXT_DARK,
    fontWeight: "700",
  },
});
