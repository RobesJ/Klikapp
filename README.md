# KLIKON CRM

A comprehensive Customer Relationship Management (CRM) application designed for chimney sweep service providers. Built with React Native and Expo, this mobile-first application enables service professionals to manage clients, objects (chimneys), projects, and planning efficiently.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Dependencies](#dependencies)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
- [Navigation Structure](#navigation-structure)
- [Testing](#testing)
- [Building for Production](#building-for-production)
- [Planned Improvements](#planned-improvements)
- [Notes & Tips](#notes--tips)
- [License](#license)

## Project Overview

KLIKON CRM is a mobile application built with React Native and Expo that helps chimney sweep service providers manage their business operations. The app provides a complete solution for managing clients, tracking service objects (chimneys), organizing projects, and planning work schedules. It features authentication, real-time data synchronization with Supabase, PDF report generation, photo management, and Google Places integration for address autocomplete.

## Features

### Core Functionality
- **Client Management**: Create, read, update, and delete client records with support for both individual and legal entity types
- **Object Management**: Track and manage chimney objects associated with clients
- **Project Management**: Organize service projects with detailed information and status tracking
- **Planning & Calendar**: Schedule and view upcoming work assignments
- **Authentication**: Secure user authentication and session management via Supabase Auth
- **Data Synchronization**: Real-time data sync with Supabase backend
- **PDF Generation**: Generate professional cleaning records and reports
- **Photo Management**: Capture, store, and manage photos for projects and objects
- **Address Autocomplete**: Google Places integration for accurate address input
- **Basic Caching**: In-memory caching with Zustand for improved performance
- **Locking Mechanism**: Prevent concurrent editing conflicts with client locking

### UI/UX Features
- **Modern Design**: Clean, dark-themed interface with custom typography
- **Responsive Layout**: Optimized for various screen sizes
- **Custom Drawer Navigation**: Side drawer for quick access to main sections
- **Tab Navigation**: Bottom tab bar for primary app sections
- **Modal Presentations**: Modal transitions for forms and details (animations to be improved)
- **Toast Notifications**: User feedback for actions and errors
- **Loading States**: Proper loading indicators throughout the app

## Project Structure

```
klikon-crm/
├── app/                         # Expo Router file-based routing
│   ├── _layout.tsx              # Root layout with Stack navigator
│   ├── index.tsx                # Entry point (redirects to login)
│   ├── settings.tsx             # Settings screen
│   ├── (auth)/                  # Authentication group
│   │   ├── _authLayout.tsx      # Auth stack layout
│   │   ├── login.tsx            # Login screen
│   │   ├── register.tsx         # Registration screen
│   │   ├── forgot-pwd.tsx       # Password recovery
│   │   └── reset-pwd.tsx        # Password reset
│   ├── (drawer)/                # Drawer navigation group
│   │   ├── _layout.tsx          # Drawer layout
│   │   └── (tabs)/              # Tab navigation group
│   │       ├── _layout.tsx      # Tab layout with auth guard
│   │       ├── home.tsx         # Home/Dashboard tab
│   │       ├── clients.tsx      # Clients list tab
│   │       ├── objects.tsx      # Objects list tab
│   │       ├── projects.tsx     # Projects list tab
│   │       └── planning.tsx     # Planning/Calendar tab
│   ├── addClientScreen.tsx      # Modal like Add/Edit client
│   ├── addObjectScreen.tsx      # Modal like Add/Edit object
│   └── addProjectScreen.tsx     # Modal like Add/Edit project
│
├── components/                   # Reusable UI components
│   ├── animatedScreen.tsx       # Screen transition animations
│   ├── badge.tsx                # Badge component
│   ├── customDrawer.tsx         # Custom drawer content
│   ├── formInput.tsx            # Form input component
│   ├── modernDatePicker.tsx     # Date picker component
│   ├── notificationToast.tsx    # Toast notification component
│   ├── typography.tsx           # Typography components
│   ├── weekCalendar.tsx         # Calendar component
│   ├── cardDetails/             # Detail view components
│   │   ├── clientDetails.tsx
│   │   ├── objectDetails.tsx
│   │   └── projectDetails.tsx
│   ├── cards/                   # Card components for lists
│   │   ├── clientCard.tsx
│   │   ├── objectCard.tsx
│   │   └── projectCard.tsx
│   ├── forms/                   # Form components
│   │   ├── chimneyForm.tsx
│   │   ├── clientForm.tsx
│   │   ├── objectForm.tsx
│   │   └── projectForm.tsx
│   └── modals/                  # Modal components
│       ├── chimneyTypeCreationModal.tsx
│       ├── chimneyTypeSelectionModal.tsx
│       ├── filterModal.tsx
│       ├── objectPickerModal.tsx
│       ├── pdfGenerationModal.tsx
│       ├── pdfViewer.tsx
│       ├── photoViewer.tsx
│       └── userPickerModal.tsx
│
├── context/                      # React Context providers
│   └── authContext.tsx          # Authentication context
│
├── hooks/                        # Custom React hooks
│   ├── useGoogleAddressSearch.ts    # Google Places autocomplete
│   ├── useHandlePDFs.ts             # PDF handling utilities
│   ├── useHandlePhotos.ts           # Photo handling utilities
│   ├── useSearchClient.ts           # Client search functionality
│   └── submitHooks/                 # Form submission hooks
│       ├── useObjectSubmit.ts
│       └── useProjectSubmit.ts
│
├── store/                        # Zustand state management
│   ├── clientStore.tsx          # Client state and operations
│   ├── notificationStore.tsx    # Notification state
│   ├── objectStore.tsx          # Object state and operations
│   └── projectStore.tsx         # Project state and operations
│
├── services/                     # Business logic services
│   └── pdfService.tsx           # PDF generation service
│
├── types/                        # TypeScript type definitions
│   ├── generics.ts              # Shared types (Client, Project, User)
│   ├── objectSpecific.ts        # Object/Chimney specific types
│   └── projectSpecific.ts       # Project specific types
│
├── lib/                          # Library configurations
│   └── supabase.js              # Supabase client setup
│
├── constants/                    # App constants
│   └── icons.ts                 # Icon mappings
│
├── utils/                        # Utility functions
│   └── responsive.ts            # Responsive design utilities
│
├── assets/                       # Static assets
│   ├── icons/                   # App icons
│   └── images/                  # Images and logos
│
├── android/                      # Android native configuration
├── ios/                          # iOS native configuration
└── dist/                         # Web build output
```

## Navigation Structure

The app uses **Expo Router** with a hierarchical navigation structure:

### Root Stack (`app/_layout.tsx`)
- Main entry point with `Stack` navigator
- Wraps the entire app with `AuthProvider`, `SafeAreaProvider`, and `GestureHandlerRootView`
- Defines screen groups:
  - `index` - Entry screen (redirects to login)
  - `(auth)` - Authentication flow
  - `(drawer)` - Main app with drawer navigation
  - `addClientScreen`, `addObjectScreen`, `addProjectScreen` - Modal screens
  - `settings` - Settings screen

### Authentication Stack (`app/(auth)/_authLayout.tsx`)
- Handles deep linking for password reset
- Redirects authenticated users to home
- Screens:
  - `login` - User login
  - `register` - User registration
  - `forgot-pwd` - Password recovery
  - `reset-pwd` - Password reset (via deep link)

### Drawer Navigation (`app/(drawer)/_layout.tsx`)
- Custom drawer with dark theme
- Contains the tab navigation group
- Provides side menu access

### Tab Navigation (`app/(drawer)/(tabs)/_layout.tsx`)
- **Auth Guard**: Redirects unauthenticated users to login
- Bottom tab bar with 5 main sections:
  - **Home** (`home.tsx`) - Dashboard
  - **Clients** (`clients.tsx`) - Client management
  - **Objects** (`objects.tsx`) - Chimney/object management
  - **Projects** (`projects.tsx`) - Project management
  - **Planning** (`planning.tsx`) - Calendar and scheduling

### Special Layout Files
- `_layout.tsx` files define navigation structure and screen options
- Groups in parentheses `(auth)`, `(drawer)`, `(tabs)` create navigation hierarchies
- Modal screens use `presentation: 'modal'` and `animation: 'slide_from_bottom'`

## Dependencies

### Core Framework
- **expo**: ~54.0.20 - Expo SDK
- **react**: 19.1.0 - React library
- **react-native**: ^0.81.5 - React Native framework
- **expo-router**: ^6.0.21 - File-based routing for Expo

### Navigation
- **@react-navigation/native**: ^7.1.26 - Navigation library
- **@react-navigation/drawer**: ^7.7.9 - Drawer navigation
- **@react-navigation/bottom-tabs**: ^7.4.0 - Tab navigation
- **react-native-gesture-handler**: ~2.28.0 - Gesture handling
- **react-native-reanimated**: ~4.1.1 - Animations
- **react-native-safe-area-context**: ^5.6.2 - Safe area handling
- **react-native-screens**: ~4.16.0 - Native screen components

### Backend & Database
- **@supabase/supabase-js**: ^2.76.1 - Supabase client
- **@react-native-async-storage/async-storage**: 2.2.0 - Local storage

### UI & Styling
- **nativewind**: ^4.2.1 - Tailwind CSS for React Native
- **tailwindcss**: ^3.4.18 - Tailwind CSS
- **@expo/vector-icons**: ^15.0.3 - Icon library
- **@shopify/flash-list**: ^2.2.0 - High-performance list component

### Forms & Validation
- **react-hook-form**: ^7.65.0 - Form management
- **@react-native-community/datetimepicker**: 8.4.4 - Date/time picker

### Media & Files
- **expo-camera**: ~17.0.9 - Camera access
- **expo-image-picker**: ~17.0.8 - Image selection
- **expo-image**: ~3.0.10 - Image component
- **expo-print**: ^15.0.7 - PDF generation
- **expo-file-system**: ~19.0.19 - File system access
- **expo-sharing**: ^14.0.7 - File sharing

### Utilities
- **zustand**: ^5.0.8 - State management
- **date-fns**: ^4.1.0 - Date manipulation
- **lodash.debounce**: ^4.0.8 - Debounce utility
- **react-native-google-places-autocomplete**: ^2.5.7 - Google Places
- **react-native-calendars**: ^1.1313.0 - Calendar component
- **react-native-date-picker**: ^5.0.13 - Date picker

### Development Tools
- **typescript**: ~5.9.2 - TypeScript
- **eslint**: ^9.25.0 - Linting
- **jest**: ^30.2.0 - Testing framework
- **@testing-library/react-native**: ^13.3.3 - React Native testing utilities

## Setup Instructions

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** or **yarn** package manager
- **Expo CLI** (installed globally or via npx)
- **iOS Simulator** (for macOS) or **Android Studio** (for Android development)
- **Supabase account** and project
- **Google Cloud Platform** account (for Maps API key)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd klikon-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_supabase_dbs_link=your_supabase_url
   EXPO_PUBLIC_supabase_api_key=your_supabase_anon_key
   EXPO_PUBLIC_MAPS_API_KEY=your_google_maps_api_key
   ```

   See [Environment Variables](#environment-variables) for details.

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   # or
   expo start
   ```

5. **Run on a platform**
   - **iOS Simulator**: Press `i` in the terminal or run `npm run ios`
   - **Android Emulator**: Press `a` in the terminal or run `npm run android`
   - **Web**: Press `w` in the terminal or run `npm run web`
   - **Physical Device**: Scan the QR code with Expo Go app

### Platform-Specific Setup

#### iOS
```bash
npm run ios
# or
expo run:ios
```

**Note**: Requires Xcode and CocoaPods. Run `cd ios && pod install` if needed.

#### Android
```bash
npm run android
# or
expo run:android
```

**Note**: Requires Android Studio and Android SDK. Ensure an emulator is running or a device is connected.

#### Web
```bash
npm run web
# or
expo start --web
```

## Environment Variables

The application requires the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_supabase_dbs_link` | Supabase project URL | Yes |
| `EXPO_PUBLIC_supabase_api_key` | Supabase anonymous/public API key | Yes |
| `EXPO_PUBLIC_MAPS_API_KEY` | Google Maps API key for Places autocomplete | Yes |

### Setting Up Environment Variables

1. **Supabase Setup**:
   - Create a project at [supabase.com](https://supabase.com)
   - Navigate to Project Settings > API
   - Copy the "Project URL" and "anon/public" key

2. **Google Maps API Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a project or select an existing one
   - Enable "Places API" and "Geocoding API"
   - Create credentials (API Key)
   - Restrict the key to your app's bundle identifier (for production)

3. **Create `.env` file**:
   ```env
   EXPO_PUBLIC_supabase_dbs_link=https://your-project.supabase.co
   EXPO_PUBLIC_supabase_api_key=your-anon-key-here
   EXPO_PUBLIC_MAPS_API_KEY=your-google-maps-key-here
   ```

**Important**: The `.env` file should be added to `.gitignore` to prevent committing sensitive keys.

## Usage

### Authentication Flow

1. **First Launch**: The app redirects to the login screen
2. **Login**: Enter credentials to access the main app
3. **Registration**: New users can register via the register screen
4. **Password Recovery**: Use "Forgot Password" to receive a reset link
5. **Auto-redirect**: Authenticated users are automatically redirected to the home screen

### Main Navigation

- **Drawer Menu**: Swipe from the left edge or tap the menu icon to open the drawer
- **Tab Navigation**: Use the bottom tab bar to switch between main sections:
  - **Home**: Dashboard and overview
  - **Clients**: View and manage client list
  - **Objects**: Manage chimney/object records
  - **Projects**: Track service projects
  - **Planning**: Calendar view for scheduling

### Creating Records

- **Add Client**: Navigate to Clients tab → Tap "Add Client" button → Fill form → Submit
- **Add Object**: Navigate to Objects tab → Tap "Add Object" → Select client → Fill form
- **Add Project**: Navigate to Projects tab → Tap "Add Project" → Select client/object → Fill form

### Features Usage

- **Search**: Use search bars in list screens to filter records
- **Filter**: Access filter modals to refine list views
- **Details**: Tap any card to view detailed information
- **Edit**: Access edit mode from detail screens
- **Delete**: Swipe or use delete actions (with confirmation)
- **PDF Generation**: Generate reports from project details (regeneration feature planned)
- **Photo Management**: Capture or select photos for projects/objects
- **Address Autocomplete**: Start typing addresses to get Google Places suggestions

## Testing

The project includes Jest testing setup with React Native Testing Library.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

Tests are located in `hooks/__tests__/`:
- `useGoogleAddressSearch.test.ts` - Google Places hook tests
- `useHandlePDFs.test.ts` - PDF handling tests
- `useHandlePhotos.test.ts` - Photo handling tests
- `useSearchClient.test.ts` - Client search tests
- `submitHooks/` - Form submission hook tests

### Test Configuration

- **Jest Config**: `jest.config.js`
- **Setup File**: `jest.setup.js`
- **Test Environment**: Node (for unit tests)
- **Path Mapping**: `@/*` maps to project root

### Known Test Issues

The test suite currently has some warnings that need to be addressed:
- **React `act()` Warnings**: Some tests in `useSearchClient.test.ts` have state updates that are not properly wrapped in `act()`. This causes console warnings but doesn't fail tests. These should be fixed by properly wrapping async state updates in `act()` calls.
- **Test Coverage**: While tests exist for core hooks, comprehensive test coverage across all components and stores is planned for improvement.

## Building for Production

### Prerequisites for Building

1. **EAS Build** (Recommended):
   - Install EAS CLI: `npm install -g eas-cli`
   - Login: `eas login`
   - Configure: `eas build:configure`

2. **Build Commands**:
   ```bash
   # Build for iOS
   eas build --platform ios

   # Build for Android
   eas build --platform android

   # Build for both
   eas build --platform all
   ```

### Local Builds

#### iOS
```bash
cd ios
pod install
cd ..
expo run:ios --configuration Release
```

#### Android
```bash
expo run:android --variant release
```

### Environment-Specific Builds

Ensure environment variables are set correctly for production builds. Consider using EAS Secrets or environment-specific configuration files.

## Notes & Tips

### Current Performance Features

- **FlashList**: The app uses `@shopify/flash-list` for high-performance list rendering
- **In-Memory Caching**: Client data is cached in Zustand store for 5 minutes to reduce API calls
- **Pagination**: Lists support pagination with `loadMore` functionality
- **Lazy Loading**: Some tabs can be configured for lazy loading (commented in code)

**Note**: Performance optimizations are ongoing. See [Planned Improvements](#planned-improvements) for upcoming enhancements.

### Development Tips

1. **Hot Reload**: Expo provides fast refresh - changes appear instantly
2. **Debugging**: Use React Native Debugger or Chrome DevTools
3. **TypeScript**: Strict mode is enabled - fix type errors as you develop
4. **Linting**: Run `npm run lint` to check code quality
5. **State Management**: Zustand stores are in `store/` directory - check for available actions

### Common Issues

- **Metro Bundler Cache**: Clear cache with `expo start -c` if experiencing issues
- **Native Modules**: After installing new native modules, rebuild the app
- **Supabase Connection**: Verify environment variables if seeing connection errors
- **Google Maps**: Ensure API key has proper restrictions and enabled APIs

### Code Organization

- **Components**: Reusable UI components in `components/`
- **Hooks**: Custom hooks in `hooks/` for shared logic
- **Stores**: Zustand stores for global state management
- **Types**: TypeScript definitions in `types/` for type safety
- **Services**: Business logic services in `services/`

### Database Schema

The app expects Supabase tables:
- `clients` - Client records
- `objects` - Object/chimney records
- `projects` - Project records
- `users` - User accounts (managed by Supabase Auth)

Ensure your Supabase project has the appropriate tables, relationships, and Row Level Security (RLS) policies configured.

## Planned Improvements

The following features and improvements are planned for future releases:

### Local Storage & Offline Support
- **Persistent Local Storage**: Implement comprehensive local storage using AsyncStorage to persist data offline
- **Offline-First Architecture**: Enable full offline functionality with data synchronization when connection is restored
- **Conflict Resolution**: Handle data conflicts when syncing offline changes with server data
- **Cache Management**: Improve cache invalidation strategies and storage management

### Performance Enhancements
- **Optimize List Rendering**: Further optimize FlashList usage and implement virtual scrolling improvements
- **Image Optimization**: Implement image compression and lazy loading for better performance
- **Bundle Size Reduction**: Code splitting and tree shaking to reduce app bundle size
- **Memory Management**: Optimize memory usage, especially for large lists and image galleries
- **Network Optimization**: Implement request batching and reduce unnecessary API calls

### Testing & Quality Assurance
- **Comprehensive Test Coverage**: Expand test coverage to include all components, stores, and services
- **Fix Test Warnings**: Resolve React `act()` warnings in test files (particularly in `useSearchClient.test.ts`)
- **Integration Tests**: Add integration tests for critical user flows
- **E2E Testing**: Implement end-to-end testing for major features
- **Test Automation**: Set up CI/CD pipeline with automated testing

### UI/UX Improvements
- **Enhanced Screen Transitions**: Improve and polish screen transition animations throughout the app
- **Smooth Animations**: Refine modal, drawer, and tab navigation animations for better user experience
- **Loading States**: Enhance loading indicators and skeleton screens
- **Error Handling**: Improve error messages and recovery flows

### PDF Features
- **PDF Regeneration**: Add ability to regenerate PDFs with updated data without recreating from scratch
- **PDF Templates**: Support for multiple PDF templates and customization options
- **PDF Preview**: Enhanced PDF preview with zoom and navigation controls
- **PDF History**: Track PDF generation history and versions

### Data Quality & Validation
- **Client Duplication Check**: Implement duplicate client detection and prevention
- **Data Validation**: Enhanced form validation with better error messages
- **Data Integrity**: Add checks to prevent data inconsistencies
- **Import/Export**: Add data import and export functionality

### Additional Features
- **Search Improvements**: Enhanced search functionality with filters and sorting options
- **Notifications**: Push notifications for important events and reminders
- **Analytics**: User analytics and usage tracking
- **Accessibility**: Improve accessibility features for better usability

## License

This project is private and proprietary. All rights reserved.

---

**Note**: This README is generated based on the current codebase structure. For the most up-to-date information, refer to the source code and project documentation.
