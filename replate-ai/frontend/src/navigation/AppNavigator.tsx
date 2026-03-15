import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CapturePhotoScreen from "../screens/CapturePhotoScreen";
import IngredientReviewScreen from "../screens/IngredientReviewScreen";
import RecipeGenerationScreen from "../screens/RecipeGenerationScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";

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
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
      }}
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
