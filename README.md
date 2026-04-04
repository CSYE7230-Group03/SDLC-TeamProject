# ReplateAI

> Photograph your leftovers, identify your ingredients with AI, and get personalized recipes — then order what you're missing directly from Walmart.

[![CI Pipeline](https://github.com/CSYE7230-Group03/SDLC-TeamProject/actions/workflows/ci.yml/badge.svg)](https://github.com/CSYE7230-Group03/SDLC-TeamProject/actions/workflows/ci.yml)
[![API Docs](https://img.shields.io/badge/API%20Docs-Swagger%20UI-85EA2D?logo=swagger)](https://csye7230-group03.github.io/SDLC-TeamProject/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-000020?logo=expo)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Continuous Deployment](#continuous-deployment)
- [License](#license)

---

## Overview

ReplateAI solves a common problem: you have ingredients in your fridge, no plan for dinner, and no idea what to make. Instead of ordering takeout or letting food go to waste, you open ReplateAI, photograph what you have, and within seconds the app identifies your ingredients and generates recipes tailored to what is already in your kitchen.

The app is built as a three-service monorepo. A React Native mobile frontend communicates with a Node.js REST API, which delegates ingredient detection to a Python FastAPI microservice powered by OpenAI's GPT-4.1-mini vision model. When a recipe calls for something you are missing, ReplateAI connects directly to the Walmart API so you can add items to a cart and check out without leaving the app.

ReplateAI is developed as a software engineering capstone project following Scrum/Agile practices, with sprint planning, issue-tracked development, and a continuous integration pipeline that validates all three services on every pull request.

---

## Features

- **AI Ingredient Detection** — Photograph your fridge or pantry and have GPT-4.1-mini vision identify every ingredient automatically
- **Recipe Generation** — Receive personalized recipe suggestions based on detected ingredients via the Spoonacular API
- **Grocery Ordering via Walmart** — Browse missing ingredients and place a Walmart order in-app through a seamless WebView checkout flow
- **Inventory Tracking** — Automatically updates your ingredient inventory when you complete a recipe
- **User Authentication** — Email/password sign-up and login powered by Firebase Authentication
- **Ingredient Review** — Manually add, remove, or correct detected ingredients before generating recipes
- **Recipe History** — Browse every recipe you have made with ReplateAI
- **Grocery List Management** — Build and manage a running grocery list across sessions
- **Profile and Preferences** — Customize dietary preferences that influence recipe recommendations
- **Push Notifications** — Receive timely reminders and recipe suggestions via Expo Notifications
- **Cross-platform** — Runs on iOS, Android, and web from a single Expo codebase

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                       │
│              React Native + TypeScript (iOS/Android/Web)    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS (port 5050)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Service (Node.js Express)               │
│                                                             │
│  /auth        /ingredients    /recipes      /groceryOrder   │
│  /profile     /inventory      /recipeHistory /groceryList   │
│  /settings                                                  │
│                                                             │
│  firebase-admin  @aws-sdk/client-s3  multer  swagger-ui     │
└────┬──────────────┬────────────┬──────────────┬─────────────┘
     │              │            │              │
     ▼              ▼            ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐
│Firebase │  │  AWS S3  │  │Spoonacular│  │  Walmart API │
│Firestore│  │ (images) │  │ (recipes) │  │  (grocery)   │
│  Auth   │  └──────────┘  └──────────┘  └──────────────┘
└─────────┘
     ▲
     │  POST /ingredients/identify
     │
┌─────────────────────────────────────────────────────────────┐
│                  AI Service (Python FastAPI)                 │
│                                                             │
│  Receives image URL → OpenAI GPT-4.1-mini vision           │
│  Returns structured ingredient list                         │
│  Falls back to mock data when OPENAI_API_KEY is absent      │
└─────────────────────────────────────────────────────────────┘
```

### Service Descriptions

**Frontend** (`replate-ai/frontend/`) — A React Native app built with Expo that runs on iOS, Android, and web. It handles all user interactions across 18 screens, stores auth tokens securely with `expo-secure-store`, and communicates with the API service through a centralized `api.ts` service layer.

**API Service** (`replate-ai/backend/api-service/`) — A Node.js Express server (port 5050) that acts as the system's orchestration layer. It handles authentication via Firebase Admin SDK, routes image uploads through multer to AWS S3, delegates ingredient detection to the AI service, fetches recipes from Spoonacular, and manages Firestore documents for inventory, history, and user profiles.

**AI Service** (`replate-ai/backend/ai-service/`) — A Python FastAPI microservice with a single responsibility: accept an image URL and return a structured list of identified ingredients. It calls OpenAI's `gpt-4.1-mini` vision model and returns a pydantic-validated response. When `OPENAI_API_KEY` is not set, the service returns mock data, which keeps the rest of the system functional during local development without an API key.

**SDK** (`sdk/`) — Shared Firebase Admin and AWS S3 wrapper code consumed by the backend services.

---

## Tech Stack

### Frontend

| Technology          | Purpose                                 |
| ------------------- | --------------------------------------- |
| React Native + Expo | Cross-platform mobile framework         |
| TypeScript          | Static typing                           |
| react-navigation    | Bottom tabs and native stack navigation |
| expo-image-picker   | Camera and photo library access         |
| expo-secure-store   | Secure token storage (native)           |
| expo-notifications  | Push notification support               |
| axios               | HTTP client for API calls               |

### API Service

| Technology                         | Purpose                                        |
| ---------------------------------- | ---------------------------------------------- |
| Node.js 20 + Express               | HTTP server and routing                        |
| firebase-admin                     | Firestore database and Auth token verification |
| @aws-sdk/client-s3                 | Image upload to AWS S3                         |
| multer                             | Multipart form data / file uploads             |
| swagger-jsdoc + swagger-ui-express | Interactive API documentation                  |
| cors + dotenv                      | Cross-origin support and environment config    |

### AI Service

| Technology            | Purpose                              |
| --------------------- | ------------------------------------ |
| Python 3.11 + FastAPI | High-performance async API framework |
| uvicorn               | ASGI server                          |
| pydantic              | Request/response validation          |
| OpenAI Python SDK     | GPT-4.1-mini vision inference        |

### Cloud Services

| Service                 | Purpose                                      |
| ----------------------- | -------------------------------------------- |
| Firebase Firestore      | Primary application database                 |
| Firebase Authentication | User sign-up, login, and token management    |
| AWS S3                  | Ingredient photo storage                     |
| Spoonacular API         | Recipe search and suggestions                |
| Walmart API             | In-app grocery ordering                      |
| OpenAI API              | Ingredient detection via GPT-4.1-mini vision |

---

## Prerequisites

Before running ReplateAI locally, ensure you have the following installed and configured.

**Runtime requirements:**

| Tool     | Version | Install                               |
| -------- | ------- | ------------------------------------- |
| Node.js  | 20+     | [nodejs.org](https://nodejs.org/)     |
| npm      | 9+      | Included with Node.js                 |
| Python   | 3.11+   | [python.org](https://www.python.org/) |
| Expo CLI | Latest  | `npm install -g expo-cli`             |

**Account and API key requirements:**

- **Firebase project** with Firestore, Authentication, and Storage enabled — [console.firebase.google.com](https://console.firebase.google.com/)
- **AWS account** with an S3 bucket and an IAM user that has `s3:PutObject` and `s3:GetObject` permissions
- **Spoonacular API key** — [spoonacular.com/food-api](https://spoonacular.com/food-api)
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com/) (required for live ingredient detection; the AI service falls back to mock data without it)
- **Walmart API credentials** — required only for the grocery ordering flow

---

## Getting Started

Follow these steps to run all three services locally.

### 1. Clone the repository

```bash
git clone https://github.com/CSYE7230-Group03/SDLC-TeamProject.git
cd SDLC-TeamProject
```

### 2. Configure the API service environment

```bash
cd replate-ai/backend/api-service
cp .env.example .env
```

Open `.env` and fill in your Firebase, AWS, Spoonacular, OpenAI, and Walmart credentials. See the [Environment Variables](#environment-variables) section for the full list.

### 3. Install and start the API service

```bash
# From replate-ai/backend/api-service
npm install
npm run dev
```

The API server starts on `http://localhost:5050`. Interactive Swagger docs are available at `http://localhost:5050/api-docs`.

### 4. Install and start the AI service

Open a second terminal:

```bash
cd replate-ai/backend/ai-service
pip install -r requirements.txt
uvicorn app:app --reload
```

The AI service starts on `http://localhost:8000` by default. Set `AI_SERVICE_URL=http://localhost:8000` in the API service `.env` so the two services can communicate.

### 5. Install and start the frontend

Open a third terminal:

```bash
cd replate-ai/frontend
npm install
npm start
```

Expo will open a browser tab with a QR code. Scan it with the **Expo Go** app on your phone, or press `i` to open an iOS simulator or `a` to open an Android emulator.

To run on specific platforms:

```bash
npm run ios       # iOS simulator (macOS only)
npm run android   # Android emulator
npm run web       # Web browser at http://localhost:8081
```

### 6. Verify the setup

```bash
# Check cloud service connectivity (from repo root)
npm run test:cloud
```

---

## Environment Variables

The API service requires a `.env` file at `replate-ai/backend/api-service/`. The AI service reads `OPENAI_API_KEY` from its environment.

### API Service

| Variable                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `PORT`                    | Port for the Express server (default: `5050`)                      |
| `FIREBASE_PROJECT_ID`     | Firebase project identifier                                        |
| `FIREBASE_CLIENT_EMAIL`   | Firebase service account email                                     |
| `FIREBASE_PRIVATE_KEY`    | Firebase service account private key (keep newlines as `\n`)       |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name                                       |
| `AWS_REGION`              | AWS region where the S3 bucket is hosted                           |
| `AWS_ACCESS_KEY_ID`       | AWS IAM access key ID                                              |
| `AWS_SECRET_ACCESS_KEY`   | AWS IAM secret access key                                          |
| `AWS_S3_BUCKET_NAME`      | Name of the S3 bucket for image storage                            |
| `SPOONACULAR_API_KEY`     | Spoonacular API key for recipe search                              |
| `AI_SERVICE_URL`          | Base URL of the running AI service (e.g., `http://localhost:8000`) |
| `OPENAI_API_KEY`          | OpenAI API key (used by the AI service, may also be set here)      |
| `WALMART_CLIENT_ID`       | Walmart API client ID for grocery ordering                         |
| `WALMART_CLIENT_SECRET`   | Walmart API client secret                                          |

### AI Service

| Variable         | Description                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4.1-mini vision inference. If absent, the service returns mock ingredient data. |

> **Security note:** Never commit `.env` files or credentials to version control. The `.gitignore` excludes `.env` files by default. Rotate any credentials that are accidentally exposed.

---

## API Documentation

Interactive API documentation is hosted on GitHub Pages:

**[https://csye7230-group03.github.io/SDLC-TeamProject/](https://csye7230-group03.github.io/SDLC-TeamProject/)**

The documentation is generated from OpenAPI/Swagger annotations in the API service source code and covers all endpoints across these route groups:

| Route Group      | Description                                    |
| ---------------- | ---------------------------------------------- |
| `/auth`          | User registration, login, and token management |
| `/ingredients`   | Ingredient detection via photo upload          |
| `/recipes`       | Recipe search and suggestion                   |
| `/recipeHistory` | User recipe history                            |
| `/inventory`     | Ingredient inventory management                |
| `/groceryList`   | Grocery list CRUD operations                   |
| `/groceryOrder`  | Walmart grocery order placement                |
| `/profile`       | User profile and preferences                   |
| `/settings`      | Application settings                           |

You can also access local Swagger UI at `http://localhost:5050/api-docs` when the API service is running.

---

## Project Structure

```
SDLC-TeamProject/
├── .github/
│   ├── ISSUE_TEMPLATE/          # Bug, epic, story, and question templates
│   ├── PULL_REQUEST_TEMPLATE/   # PR description template
│   └── workflows/
│       ├── ci.yml               # Main CI pipeline (backend + frontend)
│       ├── deploy-docs.yml      # GitHub Pages deployment for API docs
│       └── epics.yml            # Epic issue automation
├── docs/
│   ├── api/                     # Swagger/OpenAPI source files
│   └── CLOUD_SETUP.md           # Detailed cloud service setup guide
├── infra/
│   └── terraform/               # Infrastructure as code
├── replate-ai/
│   ├── backend/
│   │   ├── api-service/         # Node.js Express REST API (port 5050)
│   │   │   ├── src/
│   │   │   │   ├── routes/      # auth, ingredients, recipes, inventory, ...
│   │   │   │   ├── services/    # Business logic per domain
│   │   │   │   ├── middleware/  # Auth, error handling, upload
│   │   │   │   └── app.js       # Express app entry point
│   │   │   └── package.json
│   │   └── ai-service/          # Python FastAPI AI microservice
│   │       ├── app.py           # FastAPI app with /ingredients/identify
│   │       └── requirements.txt
│   └── frontend/                # React Native Expo app
│       ├── src/
│       │   ├── screens/         # 18 application screens
│       │   ├── navigation/      # AppNavigator, tab and stack config
│       │   ├── services/        # api.ts and other service clients
│       │   └── components/      # Shared UI components
│       ├── App.tsx              # Root component
│       └── package.json
├── scripts/
│   └── test-cloud-access.js     # Cloud credential validation script
├── sdk/                         # Shared Firebase Admin + AWS S3 wrappers
└── package.json                 # Root scripts (test:cloud, setup)
```

---

## Development Workflow

ReplateAI follows a Scrum/Agile process using GitHub's native project management features.

### Branch Strategy

| Branch           | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `main`           | Production-ready code; protected; merge via PR only |
| `develop`        | Integration branch for in-progress sprint work      |
| `issue-[number]` | Feature/bugfix branch for a specific GitHub issue   |

**Standard flow:**

1. Pick an issue from the sprint backlog on the Scrum Board
2. Check out `main` and pull the latest changes
3. Create an issue branch: `git checkout -b issue-42`
4. Commit your changes with conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
5. Push the branch and open a pull request against `main`
6. Pass CI and obtain at least one peer review approval
7. Squash merge into `main` — the issue branch is deleted automatically

### CI Pipeline

The GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on every push and pull request targeting `main` or `develop`. All three jobs must pass before a PR can be merged.

| Job           | Runtime     | Checks                                                           |
| ------------- | ----------- | ---------------------------------------------------------------- |
| `backend-api` | Node.js 20  | `npm ci`, lint, `node -c src/app.js` syntax check                |
| `backend-ai`  | Python 3.11 | `pip install`, `python -m py_compile app.py` syntax check        |
| `frontend`    | Node.js 20  | `npm ci`, TypeScript check (`tsc --noEmit`), lint, `expo-doctor` |

### Continuous Deployment

CD jobs are triggered automatically after all CI checks pass on `main`. Each service has its own deployment target and strategy.

#### Frontend — Expo EAS + GitHub Releases

The CD workflow calls `eas build --non-interactive` for iOS and Android using production credentials stored as GitHub Actions Secrets. Once the EAS build completes, the workflow reads the version from `package.json`, creates a tagged GitHub Release, and attaches the build artifacts.

JavaScript-only changes that do not modify native code can bypass the full EAS build cycle and be delivered directly to installed apps using OTA updates:

```bash
eas update --branch production --message "Fix recipe card layout"
```

#### Backend API + AI Service — Railway

Both backend services deploy to Railway, which watches the `main` branch directly. On each new commit, Railway builds from the `Dockerfile` in the respective service directory and performs a rolling replacement — the previous container stays live until the new one passes its health check.

| Aspect              | Detail                                                                  |
| ------------------- | ----------------------------------------------------------------------- |
| Trigger             | Push to `main` (automatic, no manual step)                              |
| Build input         | `Dockerfile` in each service directory                                  |
| Deployment strategy | Rolling replacement — zero downtime                                     |
| Environment config  | Injected at runtime from Railway's project environment; not in source   |
| Rollback            | Re-promote any prior deployment from the Railway dashboard in one click |

#### Secrets Management

Secrets are managed in three layers depending on context.

| Layer      | Store                      | How it reaches the process                                                                          |
| ---------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| Local dev  | `.env` files (git-ignored) | Loaded by the runtime directly; `.env.example` documents required keys without values               |
| CI         | GitHub Actions Secrets     | Injected as environment variables at workflow runtime; never echoed in logs                         |
| Production | AWS Secrets Manager        | Retrieved at runtime via the AWS SDK; Railway services authenticate with a least-privilege IAM role |

Example: injecting a Railway deploy token in a GitHub Actions workflow:

```yaml
env:
  RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

Production secrets (Firebase service account, AWS credentials, Spoonacular API key, OpenAI API key) are provisioned by Terraform, which references each secret by ARN — values never appear in Terraform state files. Rotating a secret requires only updating the value in AWS Secrets Manager; no redeployment is needed. Every access is recorded in AWS CloudTrail for a full audit trail.

---

### Scrum Artifacts

- **Product Backlog** — Managed as GitHub Issues on the Scrum Board project (`To Do` column)
- **Sprint Planning** — Issues are assigned to milestones (Sprint 1, Sprint 2, etc.) with due dates
- **Epics** — Large issue groups tracked with the `epic` label; sub-stories are linked as task lists
- **Releases** — Tagged on `main` at the end of each sprint (e.g., `v1.0.0`, `v1.1.0`)

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for the full text.
