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
import { forgotPassword } from "../services/api";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");

  function validate(): boolean {
    if (!email.trim()) {
      setEmailError("Email is required.");
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleSendReset() {
    setFormError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      setFormError("Could not connect to the server. Check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.brand}>🌿 ReplateAI</Text>
        </View>
        <View style={styles.confirmContainer}>
          <Text style={styles.confirmIcon}>✉️</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If <Text style={styles.emailHighlight}>{email.trim()}</Text> is registered,{"\n"}
            we've sent a password reset link.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>

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
            returnKeyType="done"
            onSubmitEditing={handleSendReset}
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendReset}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>
              Back to <Text style={styles.linkBold}>Sign In</Text>
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
  confirmContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
  },
  confirmIcon: {
    fontSize: 56,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#888",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  emailHighlight: {
    color: "#1a1a1a",
    fontWeight: "600",
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
    marginBottom: 20,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    alignSelf: "stretch",
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
