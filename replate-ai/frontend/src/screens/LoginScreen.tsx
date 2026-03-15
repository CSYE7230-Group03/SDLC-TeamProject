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
import { signIn, saveSession } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        await saveSession(result.idToken, result.refreshToken);
        navigation.replace("Capture");
      } else {
        setFormError(mapSignInError(result.error || ""));
      }
    } catch {
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
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {formError ? (
            <View style={styles.formErrorBox}>
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
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
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="Password"
            placeholderTextColor="#b0b0b0"
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
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.link}>
              Don't have an account?{" "}
              <Text style={styles.linkBold}>Sign Up</Text>
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
  formErrorBox: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 13,
    color: "#C62828",
    lineHeight: 18,
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
  inputError: {
    borderColor: "#E53935",
    backgroundColor: "#FFF8F8",
  },
  fieldError: {
    fontSize: 12,
    color: "#E53935",
    marginBottom: 10,
    marginLeft: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginTop: 6,
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: "#2196F3",
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
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
