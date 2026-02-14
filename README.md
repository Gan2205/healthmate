# HealthMate - Next.js Migration

HealthMate is a comprehensive health management application migrated from Flutter to Next.js. It features a modern UI/UX, Firebase Authentication, Firestore database integration, and AI-powered health analysis using Google Gemini.

## Features

-   **Authentication**: Secure Login and Signup using Firebase Auth (Email/Password & Google).
-   **Dashboard**: Overview of health status, vitals, and quick actions.
-   **Symptom Checker**: AI-powered analysis of symptoms with optional image upload (Gemini 1.5 Flash).
-   **Medical System**: Digital record of user profile and symptom history.
-   **Medical Plan**: Detailed AI-generated health advice including risk level, precautions, and treatment steps.
-   **AI Chat**: Interactive chat assistant for medical health queries.
-   **Responsive Design**: Fully responsive layout adapting from mobile bottom navigation to desktop sidebar.

## Tech Stack

-   **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Backend**: Firebase (Auth, Firestore)
-   **AI**: Google Generative AI (Gemini)
-   **Icons**: React Icons (Material Design)

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd healthmate
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Setup**:
    -   Ensure `lib/firebase.ts` has your Firebase configuration.
    -   The Gemini API key is currently configured in the API routes (`app/api/gemini/...`). For production, move this to `.env.local`.

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

5.  **Open Application**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

-   `app/(auth)`: Authentication pages (Login, Signup).
-   `app/(dashboard)`: Protected dashboard pages (Home, Symptom Check, Medical System, Profile, Chat).
-   `app/api/gemini`: Backend API routes for AI integration.
-   `components`: Reusable UI components.
-   `hooks`: Custom React hooks (e.g., `useUserData`).
-   `lib`: Configuration files (Firebase).

## License

[MIT](LICENSE)
