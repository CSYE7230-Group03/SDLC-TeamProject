import React, { useState, useEffect } from "react";
import { ActivityIndicator, View, Text, TouchableOpacity } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CapturePhotoScreen from "../screens/CapturePhotoScreen";
import IngredientReviewScreen from "../screens/IngredientReviewScreen";
import RecipeGenerationScreen from "../screens/RecipeGenerationScreen";
import RecipeDetailScreen from "../screens/RecipeDetailScreen";
import ProfileDetailScreen from "../screens/ProfileDetailScreen";
import ProfilePreferencesScreen from "../screens/ProfilePreferencesScreen";
import CookingCompleteScreen from "../screens/CookingCompleteScreen";
import HomeScreen from "../screens/HomeScreen";
import InventoryScreen from "../screens/InventoryScreen";
import LoginScreen from "../screens/LoginScreen";
import SignupScreen from "../screens/SignupScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import { loadStoredSession } from "../services/api";
import RecipeHistoryScreen from "../screens/RecipeHistoryScreen";
import GroceryListScreen from "../screens/GroceryListScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  Home: undefined;
  Capture: undefined;
  Inventory: undefined;
  IngredientReview: {
    detectedIngredients: { name: string; confidence: number; quantity?: number; unit?: string }[];
    imageUri?: string;
  };
  RecipeGeneration: {
    ingredients: string[];
  };
  RecipeDetail: {
    recipe: {
      id: string | number;
      title: string;
      image?: string;
      readyInMinutes?: number;
      servings?: number;
      ingredients?: { name: string; amount: number; unit: string }[];
      instructions?: string[];
    };
  };
  ProfileDetail: {
    analysis: {
      persona: string;
      emoji: string;
      description: string;
      dietType: string;
      cookingStyle: string;
      healthScore: number;
      funFact: string;
    };
  };
  ProfilePreferences: undefined;
  RecipeHistory: undefined;
  CookingComplete: {
    recipe: {
      title: string;
      image?: string;
      ingredients?: { name: string; amount: number; unit: string }[];
    };
    deducted: { name: string; previousQty: number; deductedAmount: number; newQty: number }[];
    skipped: { name: string; reason: string }[];
  };
  GroceryList: {
    listId: string;
    recipeTitle: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { theme } = useAppTheme();
  const [initializing, setInitializing] = useState(true);
  const [initialRoute, setInitialRoute] =
    useState<keyof RootStackParamList>("Login");

  useEffect(() => {
    loadStoredSession().then((loggedIn) => {
      setInitialRoute(loggedIn ? "Home" : "Login");
      setInitializing(false);
    });
  }, []);

  if (initializing) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "transparent" }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Capture"
        component={CapturePhotoScreen}
        options={({ navigation }) => ({
          title: "Capture Ingredients",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{ marginLeft: 8, padding: 4, flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.primary }}>‹ Home</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="Inventory"
        component={InventoryScreen}
        options={({ navigation }) => ({
          title: "My Inventory",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{ marginLeft: 8, padding: 4, flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.primary }}>‹ Home</Text>
            </TouchableOpacity>
          ),
        })}
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
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ title: "Recipe Details" }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ title: "Your Fridge Profile" }}
      />
      <Stack.Screen
        name="ProfilePreferences"
        component={ProfilePreferencesScreen}
        options={{ title: "Profile & Preferences" }}
      />
      <Stack.Screen
        name="RecipeHistory"
        component={RecipeHistoryScreen}
        options={({ navigation }) => ({
          title: "Recipe History",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              style={{ marginLeft: 8, padding: 4, flexDirection: "row", alignItems: "center" }}
            >
              <Text style={{ fontSize: 16, color: theme.colors.primary }}>‹ Home</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="CookingComplete"
        component={CookingCompleteScreen}
        options={{
          title: "Cooking Complete",
          headerLeft: () => null,
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="GroceryList"
        component={GroceryListScreen}
        options={{ title: "Grocery List" }}
      />
    </Stack.Navigator>
  );
}
