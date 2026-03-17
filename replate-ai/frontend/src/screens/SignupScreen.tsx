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
import { RootStackParamList } from "../navigation/AppNavigator";
import { signUp, signIn, saveSession } from "../services/api";
import { EMAIL_REGEX } from "../utils/validation";
import { authStyles } from "../styles/authStyles";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

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
          navigation.replace("Home");
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
        <Text style={styles.brand}>🌿 ReplateAI</Text>
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
    backgroundColor: "#fff",
  },
  header: {
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e8e8",
  },
  brand: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2d6a4f",
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
    color: "#1a1a1a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#888",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1a1a1a",
    marginBottom: 4,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    backgroundColor: "#90CAF9",
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
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#aaa",
  },
  link: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
  },
  linkBold: {
    color: "#2196F3",
    fontWeight: "600",
  },
});
