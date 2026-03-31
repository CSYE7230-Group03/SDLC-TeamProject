import React, { useState } from "react";
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
  SafeAreaView,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/AppNavigator";
import { signUp, signIn, saveSession } from "../services/api";
import { EMAIL_REGEX } from "../utils/validation";
import { authStyles } from "../styles/authStyles";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

const BG = "#FAFAF8";
const TEXT_DARK = "#1A1A1A";
const TEXT_MUTED = "#999999";
const BORDER = "#E0E0DE";
const INPUT_BG = "#F5F5F3";

export default function SignupScreen({ navigation }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [displayNameError, setDisplayNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [formError, setFormError] = useState("");

  function validate(): boolean {
    let valid = true;

    const name = displayName.trim();
    if (!name) {
      setDisplayNameError("Display name is required.");
      valid = false;
    } else if (name.length < 2) {
      setDisplayNameError("Display name must be at least 2 characters.");
      valid = false;
    } else {
      setDisplayNameError("");
    }

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
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password.");
      valid = false;
    } else if (password && confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match.");
      valid = false;
    } else {
      setConfirmPasswordError("");
    }

    return valid;
  }

  async function handleSignUp() {
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });

      if (result.success) {
        const loginResult = await signIn({ email: email.trim(), password });
        if (loginResult.success && loginResult.idToken && loginResult.refreshToken) {
          await saveSession(loginResult.idToken, loginResult.refreshToken, displayName.trim());
          navigation.replace("MainTabs");
        } else {
          // Account created but auto-login failed — send to Login
          navigation.replace("Login");
        }
      } else if (result.error === "Email already in use") {
        setEmailError("An account with this email already exists.");
      } else {
        setFormError("Account creation failed. Please try again.");
      }
    } catch (err) {
      console.error("[SignupScreen] signUp error:", err);
      setFormError("Could not connect to the server. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="leaf" size={18} color={TEXT_DARK} />
          <Text style={styles.brand}>ReplateAI</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join Replate AI today</Text>

          {formError ? (
            <View style={authStyles.formErrorBox}>
              <Text style={authStyles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, displayNameError ? authStyles.inputError : null]}
            placeholder="Display name"
            placeholderTextColor="#b0b0b0"
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v);
              if (displayNameError) setDisplayNameError("");
            }}
            autoCorrect={false}
            returnKeyType="next"
          />
          {displayNameError ? <Text style={authStyles.fieldError}>{displayNameError}</Text> : null}

          <TextInput
            style={[styles.input, emailError ? authStyles.inputError : null]}
            placeholder="Email address"
            placeholderTextColor="#b0b0b0"
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
            placeholderTextColor="#b0b0b0"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (passwordError) setPasswordError("");
              // Re-evaluate confirm password match on password change
              if (confirmPassword && v !== confirmPassword) {
                setConfirmPasswordError("Passwords do not match.");
              } else if (confirmPassword) {
                setConfirmPasswordError("");
              }
            }}
            secureTextEntry
            returnKeyType="next"
          />
          {passwordError ? (
            <Text style={authStyles.fieldError}>{passwordError}</Text>
          ) : (
            <Text style={authStyles.fieldHint}>Minimum 6 characters</Text>
          )}

          <TextInput
            style={[styles.input, confirmPasswordError ? authStyles.inputError : null]}
            placeholder="Confirm password"
            placeholderTextColor="#b0b0b0"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              if (v !== password) {
                setConfirmPasswordError("Passwords do not match.");
              } else {
                setConfirmPasswordError("");
              }
            }}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
          />
          {confirmPasswordError ? <Text style={authStyles.fieldError}>{confirmPasswordError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>
              Already have an account?{" "}
              <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    color: TEXT_DARK,
    letterSpacing: 0.5,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: TEXT_DARK,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: TEXT_MUTED,
    marginBottom: 32,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  button: {
    backgroundColor: TEXT_DARK,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: TEXT_MUTED,
  },
  link: {
    fontSize: 14,
    color: TEXT_MUTED,
    textAlign: "center",
  },
  linkBold: {
    color: TEXT_DARK,
    fontWeight: "600",
  },
});
