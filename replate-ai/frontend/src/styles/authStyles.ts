import { StyleSheet } from "react-native";

/** Shared styles used across Login, Signup, and ForgotPassword screens. */
export const authStyles = StyleSheet.create({
  formErrorBox: {
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  formErrorText: {
    fontSize: 13,
    color: "#C62828",
    lineHeight: 18,
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
  fieldHint: {
    fontSize: 12,
    color: "#999",
    marginBottom: 10,
    marginLeft: 4,
  },
});
