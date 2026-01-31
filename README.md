
# Oopsly

## Project Description

Oopsly is a cross-platform flashcard and spaced repetition (SRS) application designed to help users manage learning activities through relationships between concepts. The application focuses on cognitive ergonomics and effective knowledge retention.

The application aims to:

- Create tests and practice them, share them with fellow learners
- Set goals and follow goal-tracking workflows
- Practice using the Pomodoro method for focused study sessions

## Style Guide

- **Font**: System default (React Native)
- **Border Radius**: rounded-lg for cards and buttons
- **Padding**: p-4 for main containers
- **Margin**: m-2 for spacing elements
- **Shadow**: shadow-sm for subtle depth

## Theme and Color Scheme

- **Primary**: #8BC34A (Green - for main actions and brand elements)
- **Secondary**: #FF9800 (Orange - for supporting elements)
- **Accent**: #03A9F4 (Blue - for highlights and CTAs)
- **Background**: #F7F7F7 (Light gray background)
- **Surface**: #FFFFFF (White cards and surfaces)
- **Text**: #212121 (Dark gray for primary text)
- **Text Secondary**: #757575 (Medium gray for secondary text)

## Features

1. **Multiple Creation Methods**:
   - Generate tests from topics using AI
   - Upload documents for automatic test generation
   - Manually create custom flashcards

2. **Customizable Tests**:
   - Adjust question count (1-50 questions)
   - Set difficulty levels (Easy, Medium, Hard)
   - Choose question types (Multiple Choice, True/False, Short Answer)

3. **AI-Powered Generation**:
   - Intelligent topic analysis
   - Adaptive question generation
   - Personalized difficulty adjustment

4. **Progress Tracking**:
   - Visual progress indicators during generation
   - Completion percentages
   - Step-by-step processing feedback

5. **User-Friendly Interface**:
   - Clean, modern design
   - Intuitive navigation
   - Helpful tips and guidance

## Technologies Used

- **React Native**: Cross-platform mobile development framework
- **Expo**: Development platform for React Native
- **NativeWind**: Tailwind CSS implementation for React Native
- **Lucide Icons**: Lightweight SVG icon library
- **Expo Router**: File-based routing system

## Documentation

For detailed information about the project, see:

- **[Features Documentation](./docs/FEATURES.md)** - Comprehensive guide to all features
- **[API Documentation](./docs/API.md)** - REST API endpoints and usage
- **[Architecture Documentation](./docs/ARCHITECTURE.md)** - System architecture and technical design
- **[Initiative Document](./docs/initiative.md)** - Project vision and goals
- **[Story & Design](./docs/story.md)** - Design philosophy and narrative
- **[Screen Specifications](./docs/screen.md)** - UI/UX screen details
- **[Theme & Colors](./docs/theme-color.md)** - Visual design guide

## Quick Start

### For Users

1. Launch the application
2. Choose a creation method from the main screen:
   - "Upload Document" for document-based tests
   - "Generate from Topic" for AI-generated tests
   - "Create Manually" for custom flashcards
3. Configure your test settings:
   - Enter a test title and topic
   - Adjust the number of questions
   - Select difficulty level
4. Generate your test
5. Take the test or save it for later

The app provides helpful tips throughout the creation process to ensure optimal results.

## Development

### Getting Started

#### Frontend (React Native)

```bash
cd ui
pnpm install
pnpm start
```

#### Backend (Spring Boot)

```bash
cd api
./gradlew bootRun
```

#### Integration Tests

```bash
cd test
pytest
```

### Contributing

This project uses GitHub Copilot to assist with development. For comprehensive coding guidelines, best practices, and testing requirements, please refer to:

📘 **[GitHub Copilot Instructions](.github/copilot-instructions.md)**

This document includes:

- Project architecture and tech stack overview
- Coding standards for TypeScript, Java, and Python
- Testing strategy and coverage requirements
- Security and performance best practices
- Code review guidelines

### License

Licensed under the Apache License 2.0. See source files for full license headers.
