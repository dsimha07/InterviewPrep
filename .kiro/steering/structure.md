# Project Structure

## Root Layout

```
interview-prep/
├── client/                  # React + Vite frontend
├── server/                  # Node.js REST API backend
├── database/                # SQLite schema and seed files
└── .kiro/                   # Kiro steering and spec files
```

## Frontend — client/

```
client/
├── public/                  # Static assets (favicon, logo)
├── src/
│   ├── assets/              # Images, fonts, icons
│   ├── components/          # Reusable UI components (PascalCase)
│   │   ├── common/          # Shared components (Button, Input, Modal)
│   │   ├── layout/          # Page layout components (Header, Footer, Sidebar)
│   │   └── interview/       # Interview-specific components (QuestionCard, Timer)
│   ├── pages/               # Top-level route pages
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── InterviewPage.jsx
│   │   └── ResultsPage.jsx
│   ├── hooks/               # Custom React hooks (camelCase, prefix with "use")
│   ├── services/            # API call functions — one file per resource
│   │   ├── authService.js
│   │   ├── questionService.js
│   │   └── feedbackService.js
│   ├── context/             # React context providers
│   ├── utils/               # Pure helper functions
│   ├── styles/              # Global CSS and CSS variables (brand colors, fonts)
│   │   └── variables.css    # Brand color tokens from design.md
│   ├── App.jsx              # Root component and routing
│   └── main.jsx             # Vite entry point
├── index.html
├── vite.config.js
└── package.json
```

## Backend — server/

```
server/
├── src/
│   ├── routes/              # Express route definitions — one file per resource
│   │   ├── auth.js
│   │   ├── questions.js
│   │   ├── sessions.js
│   │   └── feedback.js
│   ├── controllers/         # Request handlers (PascalCase filenames)
│   │   ├── AuthController.js
│   │   ├── QuestionController.js
│   │   ├── SessionController.js
│   │   └── FeedbackController.js
│   ├── models/              # SQLite data access layer
│   │   ├── User.js
│   │   ├── Question.js
│   │   ├── Session.js
│   │   └── Answer.js
│   ├── middleware/          # Express middleware (auth, error handling, logging)
│   │   ├── authenticate.js
│   │   └── errorHandler.js
│   ├── services/            # Business logic (AI feedback, scoring)
│   │   ├── ollamaService.js # Ollama / Llama 3.2 integration
│   │   └── scoringService.js
│   ├── utils/               # Shared helpers and logger
│   │   └── logger.js        # Timestamp + severity + source logging
│   └── app.js               # Express app setup
├── server.js                # Entry point
└── package.json
```

## Database — database/

```
database/
├── schema.sql               # Table definitions
├── seed.sql                 # Initial question bank data
└── interview-prep.db        # SQLite database file (gitignored)
```

## Naming Conventions

| Context                  | Convention            | Example                  |
|--------------------------|-----------------------|--------------------------|
| React components         | PascalCase            | `QuestionCard.jsx`       |
| Hooks                    | camelCase + "use"     | `useSessionTimer.js`     |
| Variables / functions    | camelCase             | `calculateTotalScore`    |
| Constants                | SCREAMING_SNAKE_CASE  | `MAX_QUESTIONS`          |
| CSS classes / attributes | kebab-case            | `question-card`          |
| Controllers              | PascalCase            | `FeedbackController.js`  |
| Route files              | lowercase             | `questions.js`           |

## File Organization Rules

- One component per file — no bundling multiple components together
- Co-locate tests next to the file they test: `Button.jsx` → `Button.test.jsx`
- Keep services thin — they call the API only; business logic lives in controllers
- All brand color values must reference `variables.css` tokens, not hardcoded hex values
