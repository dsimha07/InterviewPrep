# Tech Stack

## Frontend
- **Framework**: React.js with Vite
- **Language**: JavaScript (JSX)
- **Runs on**: localhost (no cloud deployment)
- **Styling**: CSS with brand guidelines from design.md

## Backend / API
-**backend**: Node.js + Express for the backend
- **Style**: REST API
- **Runtime**: Node.js
- **Database**: SQLite (local file-based storage)
- **Auth**: Basic authentication — email + password stored in SQLite

## AI Feedback
- **Model**: Ollama running Llama 3.2 locally
- **Purpose**: Evaluate and score user answers to interview questions
- **Constraint**: Must run fully offline — no external API calls

## Speech Input
- **API**: Web Speech API (browser-native)
- **Use case**: Optional voice input for answer submission during interview mode

## Dev Tooling
- **Formatter**: Prettier (enforced, no exceptions)
- **Package manager**: npm
- **Build tool**: Vite
- **Testing**: Unit tests required for all functions, methods, and components

## Key Constraints
- Client-side only — no cloud deployment
- No mobile app — web browser only
- No real-time video or audio interviews
- No complex auth — basic login only
- All data stays local (SQLite + Ollama)

## Configuration Standards
- Never hardcode config values, API URLs, or credentials in code
- Store all config in .env files (never committed to git)
- Sensitive values must never appear in source code
- All environment variables must be documented in .env.example
