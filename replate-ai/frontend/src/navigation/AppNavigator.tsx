import React, { useState, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import BottomTabBar from "../components/BottomTabBar";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
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

export type TabParamList = {
  Home: undefined;
  Inventory: undefined;
  Capture: undefined;
  History: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Capture" component={CapturePhotoScreen} />
      <Tab.Screen name="History" component={RecipeHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfilePreferencesScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { theme } = useAppTheme();
  const [initializing, setInitializing] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadStoredSession().then((loggedIn) => {
      setIsLoggedIn(loggedIn);
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
      initialRouteName={isLoggedIn ? "MainTabs" : "Login"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="IngredientReview"
        component={IngredientReviewScreen}
        options={{
          headerShown: true,
          title: "Review Ingredients",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="RecipeGeneration"
        component={RecipeGenerationScreen}
        options={{
          headerShown: true,
          title: "Generated Recipes",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CookingComplete"
        component={CookingCompleteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GroceryList"
        component={GroceryListScreen}
        options={{
          headerShown: true,
          title: "Grocery List",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
