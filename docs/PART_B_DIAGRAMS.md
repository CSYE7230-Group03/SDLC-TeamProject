# Part B - UML Diagrams

This document contains all UML diagrams for the CSYE 7230 Project Part B report.
Diagrams are written in Mermaid syntax for collaborative editing.
Please remove/add features based on your work. We will export as images for the final PDF report. 

---

## 1. Use Case Diagram

Describes the use cases of the application and the actors and external systems involved.

```mermaid
graph TB
    subgraph Actors
        User((User))
        Admin((Admin))
    end

    subgraph External Systems
        GoogleVision[Google Vision API]
        Spoonacular[Spoonacular API]
        OpenAI[OpenAI API]
        Instacart[Instacart API]
        Firebase[Firebase]
        AWSS3[AWS S3]
    end

    subgraph ReplateAI Application
        UC1[Sign Up / Sign In / Logout]
        UC2[Manage Profile and Dietary Preferences]
        UC3[Configure App Preferences]
        UC4[Capture Ingredients via Photo]
        UC5[Manually Add Ingredients]
        UC6[Review and Edit Detected Ingredients]
        UC7[Track Ingredient Quantity and Expiry]
        UC8[Generate Personalized Recipes]
        UC9[View Recipe Feasibility and Missing Ingredients]
        UC10[Save and View Recipe History]
        UC11[Generate Grocery List from Recipes]
        UC12[Edit Grocery List]
        UC13[Mark Ingredients as Available]
        UC14[Create Grocery Order]
        UC15[Manage Ingredient Inventory]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15

    UC1 --> Firebase
    UC4 --> GoogleVision
    UC8 --> Spoonacular
    UC8 --> OpenAI
    UC14 --> Instacart
    UC10 --> Firebase
    UC15 --> Firebase
    UC4 --> AWSS3
```

---

## 2. Activity Diagram - Recipe Generation Flow

Describes the control flow for the most important use case: generating recipes from captured ingredients.

```mermaid
flowchart TD
    Start([Start]) --> CapturePhoto[User Captures Photo of Ingredients]
    CapturePhoto --> ProcessImage[Send Image to Google Vision API]
    ProcessImage --> DetectIngredients[AI Detects Ingredients]
    DetectIngredients --> DisplayResults[Display Detected Ingredients]
    DisplayResults --> UserReview{User Reviews Ingredients}
    
    UserReview -->|Edit| EditIngredients[User Edits Ingredient List]
    EditIngredients --> ConfirmList[User Confirms Ingredient List]
    UserReview -->|Confirm| ConfirmList
    
    ConfirmList --> SaveInventory[Save to Ingredient Inventory]
    SaveInventory --> CheckPreferences[Load User Dietary Preferences]
    CheckPreferences --> CallSpoonacular[Request Recipes from Spoonacular API]
    
    CallSpoonacular --> SpoonacularAvailable{Spoonacular Available?}
    SpoonacularAvailable -->|Yes| ReceiveRecipes[Receive Recipe Suggestions]
    SpoonacularAvailable -->|No| CallOpenAI[Fallback to OpenAI API]
    CallOpenAI --> OpenAIAvailable{OpenAI Available?}
    OpenAIAvailable -->|Yes| ReceiveRecipes
    OpenAIAvailable -->|No| TemplateRecipes[Use Template-Based Recipes]
    TemplateRecipes --> ReceiveRecipes
    
    ReceiveRecipes --> EvaluateFeasibility[Evaluate Recipe Feasibility]
    EvaluateFeasibility --> IdentifyMissing[Identify Missing Ingredients]
    IdentifyMissing --> DisplayRecipes[Display Recipes with Feasibility Info]
    DisplayRecipes --> UserSelect{User Selects Recipe}
    
    UserSelect -->|Save| SaveHistory[Save to Recipe History]
    UserSelect -->|Cook| MarkCooked[Mark as Cooked]
    MarkCooked --> UpdateInventory[Auto-Update Ingredient Inventory]
    UserSelect -->|Order Missing| GenerateGroceryList[Generate Grocery List]
    GenerateGroceryList --> End([End])
    SaveHistory --> End
    UpdateInventory --> End
```

---

## 3. Activity Diagram - Grocery Ordering Flow

Describes the control flow for converting recipes into grocery orders.

```mermaid
flowchart TD
    Start([Start]) --> SelectRecipes[User Selects Recipes]
    SelectRecipes --> AggregateIngredients[Aggregate All Required Ingredients]
    AggregateIngredients --> MergeDuplicates[Merge Duplicate Ingredients]
    MergeDuplicates --> GenerateList[Generate Consolidated Grocery List]
    GenerateList --> DisplayList[Display Grocery List to User]
    
    DisplayList --> EditList{User Edits List?}
    EditList -->|Yes| ModifyItems[Add / Remove / Update Items]
    ModifyItems --> DisplayList
    EditList -->|No| MarkAvailable{Mark Items as Available?}
    
    MarkAvailable -->|Yes| ExcludeAvailable[Exclude Available Items from Order]
    ExcludeAvailable --> NormalizeIngredients
    MarkAvailable -->|No| NormalizeIngredients[Normalize Ingredients for Provider]
    
    NormalizeIngredients --> StandardizeUnits[Standardize Units and Names]
    StandardizeUnits --> CreateOrderRequest[Create Provider-Agnostic Order Request]
    CreateOrderRequest --> TransformForProvider[Transform to Instacart Format]
    
    TransformForProvider --> SubmitOrder{Submit Order?}
    SubmitOrder -->|Yes| SendToInstacart[Send to Instacart API]
    SendToInstacart --> OrderSuccess{Order Successful?}
    OrderSuccess -->|Yes| Confirmation[Display Order Confirmation]
    OrderSuccess -->|No| ErrorHandling[Display Error and Retry Option]
    SubmitOrder -->|No| SaveList[Save Grocery List for Later]
    
    Confirmation --> End([End])
    ErrorHandling --> End
    SaveList --> End
```

---

## 4. Class Diagram

Describes the classes, data structures, attributes, relations, and operations of the application.

```mermaid
classDiagram
    class User {
        +String userId
        +String email
        +String name
        +DietaryPreferences preferences
        +AppSettings settings
        +signUp()
        +signIn()
        +logout()
        +updateProfile()
        +updatePreferences()
    }

    class DietaryPreferences {
        +String[] restrictions
        +String[] allergies
        +String skillLevel
        +int maxCookingTime
    }

    class AppSettings {
        +String theme
        +boolean notificationsEnabled
        +String language
    }

    class IngredientInventory {
        +String inventoryId
        +String userId
        +InventoryItem[] items
        +addItem()
        +removeItem()
        +updateQuantity()
        +getAvailableIngredients()
        +deductUsedIngredients()
    }

    class InventoryItem {
        +String ingredientName
        +float quantity
        +String unit
        +Date expiryDate
        +boolean isExpired
        +updateQuantity()
        +setExpiry()
    }

    class IngredientDetector {
        +detectFromPhoto(image) IngredientResult
        +processWithVisionAPI(image) String[]
        +processWithTensorFlow(image) String[]
        +fallbackDetection(image) String[]
    }

    class IngredientResult {
        +String[] detectedIngredients
        +float[] confidenceScores
        +String imageUrl
    }

    class RecipeEngine {
        +generateRecipes(ingredients, preferences) Recipe[]
        +evaluateFeasibility(recipe, inventory) FeasibilityResult
        +querySpoonacular(ingredients) Recipe[]
        +queryOpenAI(ingredients, preferences) Recipe[]
        +getTemplateRecipes(ingredients) Recipe[]
    }

    class Recipe {
        +String recipeId
        +String title
        +String[] ingredients
        +String[] instructions
        +int cookingTime
        +String difficulty
        +NutritionInfo nutrition
    }

    class FeasibilityResult {
        +boolean isFeasible
        +String[] availableIngredients
        +String[] missingIngredients
        +float matchPercentage
    }

    class RecipeHistory {
        +String historyId
        +String userId
        +HistoryEntry[] entries
        +saveRecipe()
        +getHistory()
        +markAsCooked()
    }

    class HistoryEntry {
        +String recipeId
        +Recipe recipe
        +Date generatedAt
        +Date cookedAt
        +boolean isFavorite
    }

    class GroceryList {
        +String listId
        +String userId
        +GroceryItem[] items
        +generateFromRecipes(recipes, inventory)
        +addItem()
        +removeItem()
        +updateItem()
        +markAsAvailable()
        +getOrderItems()
    }

    class GroceryItem {
        +String ingredientName
        +float quantity
        +String unit
        +String category
        +boolean isAvailable
        +String normalizedName
    }

    class GroceryOrderService {
        +createOrderRequest(groceryList) OrderRequest
        +normalizeIngredients(items) NormalizedItem[]
        +transformForProvider(orderRequest, provider) ProviderOrder
        +submitOrder(providerOrder) OrderResult
    }

    class OrderRequest {
        +String orderId
        +NormalizedItem[] items
        +String provider
        +Date createdAt
    }

    class NutritionInfo {
        +int calories
        +float protein
        +float carbs
        +float fat
    }

    User "1" --> "1" DietaryPreferences
    User "1" --> "1" AppSettings
    User "1" --> "1" IngredientInventory
    User "1" --> "1" RecipeHistory
    User "1" --> "*" GroceryList
    IngredientInventory "1" --> "*" InventoryItem
    IngredientDetector ..> IngredientResult : creates
    RecipeEngine ..> Recipe : generates
    RecipeEngine ..> FeasibilityResult : evaluates
    RecipeHistory "1" --> "*" HistoryEntry
    HistoryEntry --> Recipe
    GroceryList "1" --> "*" GroceryItem
    GroceryOrderService ..> OrderRequest : creates
    GroceryOrderService --> GroceryList : processes
    Recipe --> NutritionInfo
```

---

## 5. Sequence Diagram - Photo to Recipe Flow

Describes the scenario of a user capturing ingredients and generating recipes.

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant API as API Service
    participant AIService as AI Service (FastAPI)
    participant OpenAI as OpenAI API
    participant S3 as AWS S3
    participant DB as Firebase Firestore
    participant Spoonacular as Spoonacular API

    User->>App: Capture photo of ingredients
    App->>API: POST /ingredients/photo (image file)
    API->>S3: Upload image
    S3-->>API: Image URL
    API->>AIService: POST /ingredients/identify (imageUrl)
    AIService->>OpenAI: Analyze image for ingredients
    OpenAI-->>AIService: Detected ingredients JSON
    AIService-->>API: Ingredient list with confidence scores
    API-->>App: Ingredient list with confidence scores
    App-->>User: Display detected ingredients

    User->>App: Edit and confirm ingredients
    App->>API: POST /inventory/update (ingredients)
    API->>DB: Save to user inventory
    DB-->>API: Saved
    API-->>App: Inventory updated

    User->>App: Request recipe suggestions
    App->>API: POST /recipes/generate (ingredients, preferences)
    API->>Spoonacular: Search recipes by ingredients
    
    alt Spoonacular available
        Spoonacular-->>API: Recipe results
    else Spoonacular unavailable or quota exceeded
        API->>OpenAI: Generate recipes with prompt
        OpenAI-->>API: Generated recipes
    end

    API->>DB: Check user inventory
    DB-->>API: Current inventory
    API->>API: Evaluate feasibility for each recipe
    API-->>App: Recipes with feasibility info
    App-->>User: Display recipe options

    User->>App: Select recipe
    App->>API: POST /history/save (recipe)
    API->>DB: Save to recipe history
    DB-->>API: Saved
    API-->>App: Recipe saved
```

---

## 6. Sequence Diagram - Grocery Ordering Flow

Describes the scenario of a user creating a grocery order from selected recipes.

```mermaid
sequenceDiagram
    actor User
    participant App as Mobile App
    participant API as API Service
    participant DB as Firebase Firestore
    participant Instacart as Instacart API

    User->>App: Select recipes for grocery list
    App->>API: POST /grocery/generate (recipeIds)
    API->>DB: Fetch recipe ingredients
    DB-->>API: Recipe ingredient data
    API->>DB: Fetch user inventory
    DB-->>API: Current inventory
    API->>API: Aggregate ingredients
    API->>API: Merge duplicates and sum quantities
    API-->>App: Consolidated grocery list
    App-->>User: Display grocery list

    User->>App: Edit list (add/remove/update items)
    User->>App: Mark some items as available
    App->>API: PUT /grocery/update (updatedList)
    API-->>App: List updated

    User->>App: Proceed to order
    App->>API: POST /grocery/order (listId)
    API->>API: Normalize ingredient names and units
    API->>API: Create provider-agnostic order request
    API->>API: Transform to Instacart format
    API->>Instacart: Submit order
    
    alt Order successful
        Instacart-->>API: Order confirmation
        API->>DB: Save order record
        API-->>App: Order confirmed
        App-->>User: Display confirmation
    else Order failed
        Instacart-->>API: Error response
        API-->>App: Error with retry option
        App-->>User: Display error message
    end
```

---

## Notes for Team

- Edit this file directly and push changes to collaborate
- Use Mermaid Live Editor (https://mermaid.live) to preview diagrams
- Export diagrams as PNG/SVG for the final PDF report
- Each team member can contribute to their relevant sections
