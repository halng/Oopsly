
# Osmosis

## Project Description

Osmosis is an intelligent test generation application designed to help students create customized assessments for effective studying. With features to generate tests from topics, documents, or manually create flashcards, users can tailor their learning experience to any subject matter.

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

### For Developers

#### Prerequisites
- Node.js 18+
- Java 21
- Docker & Docker Compose
- Expo CLI

#### Setup

```bash
# Clone the repository
git clone https://github.com/halng/Oopsly.git
cd Oopsly

# Backend setup
cd api
./gradlew bootRun

# Frontend setup (in a new terminal)
cd ui
npm install
npx expo start

# Database (in a new terminal)
docker-compose up postgres
```

#### Running Tests

```bash
# Backend tests
cd api
./gradlew test

# Frontend tests
cd ui
npm test

# Integration tests
cd test
pytest
```

## Project Structure

```
Oopsly/
├── api/           # Spring Boot backend API
├── ui/            # React Native mobile app
├── test/          # Integration and E2E tests
└── docs/          # Documentation
```
