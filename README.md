# Flashcards App

A web application for practicing thematic quizzes with spaced repetition learning.

## Features

- Load and practice quizzes from JSON files
- Multiple choice questions with multiple correct answers
- Immediate feedback with justifications for incorrect answers
- Progress tracking
- Responsive design using Material-UI
- Modern React with hooks and React Router

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Project Structure

```
flashcards/
├── src/
│   ├── components/
│   │   ├── HomePage.js
│   │   └── QuizPage.js
│   ├── App.js
│   └── index.js
├── data/
│   └── biology.json
└── package.json
```

## Adding New Quizzes

Add new quiz files in the `data` directory following this JSON structure:

```json
[
  {
    "theme": "Your Theme",
    "question": "Your Question",
    "options": [
      "Option 1",
      "Option 2",
      "Option 3"
    ],
    "correct_answers": [
      "Option 1",
      "Option 2"
    ],
    "justification_fausses_reponses": {
      "Option 3": "Explanation why this option is incorrect"
    }
  }
]
```
