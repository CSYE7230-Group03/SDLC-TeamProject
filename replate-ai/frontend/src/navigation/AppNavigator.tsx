import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CapturePhotoScreen from "../screens/CapturePhotoScreen";
import IngredientReviewScreen from "../screens/IngredientReviewScreen";
import RecipeGenerationScreen from "../screens/RecipeGenerationScreen";

export type RootStackParamList = {
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
