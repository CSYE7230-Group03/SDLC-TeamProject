# Frontend Project Structure

```text
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── screens/              # App screens / pages
│   ├── navigation/           # React Navigation setup
│   ├── services/             # API calls / network services
│   └── utils/                # Helper functions
├── assets/               # Images, fonts, icons, etc.
├── App.tsx               # Root component
├── package.json
├── package-lock.json
├── tsconfig.json             # TypeScript configuration
├── .gitignore
└── README.md
```

### Run frontend

```bash
#navigate to fronend folder
cd replate-ai/frontend

#install dependencies
npm install

#Start Metro Bundler / Expo Dev Tools
npm start
# OR
npx expo start

# Run on devices / simulators
# - Press 'i' to run on iOS simulator (Mac only)
# - Press 'a' to run on Android emulator
# - Scan QR code with Expo Go app on your physical device
# - Press 'w' to run as web app in browser