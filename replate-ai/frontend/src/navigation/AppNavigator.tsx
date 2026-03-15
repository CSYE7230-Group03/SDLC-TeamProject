import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CapturePhotoScreen from "../screens/CapturePhotoScreen";
import IngredientReviewScreen from "../screens/IngredientReviewScreen";
import RecipeGenerationScreen from "../screens/RecipeGenerationScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import { loadStoredSession } from "../services/api";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Capture: undefined;
  IngredientReview: {
    detectedIngredients: { name: string; confidence: number }[];
  };
  RecipeGeneration: {
    ingredients: string[];
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>("Login");

  useEffect(() => {
    loadStoredSession().then((loggedIn) => {
      setInitialRoute(loggedIn ? "Capture" : "Login");
      setInitializing(false);
    });
  }, []);

  if (initializing) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}
      >
        <ActivityIndicator size="large" color="#2d6a4f" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: true }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Capture"
        component={CapturePhotoScreen}
        options={{ title: "Capture Ingredients", headerShown: false }}
      />
      <Stack.Screen
        name="IngredientReview"
        component={IngredientReviewScreen}
        options={{ title: "Review Ingredients" }}
      />
      <Stack.Screen
        name="RecipeGeneration"
        component={RecipeGenerationScreen}
        options={{ title: "Generated Recipes" }}
      />
    </Stack.Navigator>
  );
}
