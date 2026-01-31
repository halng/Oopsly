# Oopsly Documentation Index

Welcome to the Oopsly (Osmosis) project documentation! This index will help you find the information you need.

## 📚 Documentation Overview

### For Users & Product Managers

- **[FEATURES.md](./FEATURES.md)** - Comprehensive guide to all implemented and planned features
  - User authentication and management
  - Test and quiz generation (manual and AI-powered)
  - Flashcard system with spaced repetition
  - Study tools (Pomodoro, planning, goals)
  - Progress tracking and analytics
  - Implementation status for each feature (✅ 🔄 📋)

### For Developers

- **[API.md](./API.md)** - Complete REST API documentation
  - All endpoints with request/response examples
  - Authentication flow (OTP + JWT)
  - Error codes and handling
  - Pagination patterns
  - Data models and enums

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and technical design
  - Technology stack details
  - Project structure (frontend & backend)
  - Data models and relationships
  - Security architecture
  - Deployment strategy
  - Performance considerations

- **[FLOW_DIAGRAMS.md](./FLOW_DIAGRAMS.md)** - End-to-end user flow diagrams
  - Complete user journeys for all features
  - Mermaid diagrams for visual understanding
  - Authentication, flashcard review, test generation flows
  - Study tools and goal tracking flows
  - System integration overview

### For Designers & Stakeholders

- **[initiative.md](./initiative.md)** - Project vision and goals
  - Mission statement
  - Architecture decisions
  - Cost strategy (~$21.50/month target)
  - Knowledge graph concept

- **[story.md](./story.md)** - Design philosophy and narrative
  - "The Keeper of the Spark" mythology
  - User journey and emotional design
  - Gamification concepts
  - Copy and messaging guidelines

- **[screen.md](./screen.md)** - UI/UX screen specifications
  - Complete screen list and functionality
  - User flows and interactions
  - Feature priorities by phase

- **[theme-color.md](./theme-color.md)** - Visual design system
  - Color palette
  - Typography
  - Component styling
  - Design principles

## 🗺️ Quick Navigation

### I want to

**...understand what Oopsly does**
→ Start with [FEATURES.md](./FEATURES.md)

**...integrate with the API**
→ Read [API.md](./API.md)

**...understand the technical architecture**
→ Check [ARCHITECTURE.md](./ARCHITECTURE.md)

**...see end-to-end user flows**
→ Review [FLOW_DIAGRAMS.md](./FLOW_DIAGRAMS.md)

**...learn about the project vision**
→ Review [initiative.md](./initiative.md)

**...understand the design philosophy**
→ Read [story.md](./story.md)

**...implement a specific screen**
→ Reference [screen.md](./screen.md)

**...apply the design system**
→ Follow [theme-color.md](./theme-color.md)

## 🎯 Implementation Status

The project uses these status indicators throughout the documentation:

- ✅ **Fully Implemented** - Feature complete with UI and backend
- 🔄 **In Development** - UI complete, backend in progress
- 📋 **Planned** - Designed but not yet implemented

### Currently Implemented (✅)

- OTP-based authentication with JWT
- User profile management
- Flashcard CRUD with difficulty levels
- Test suite and question management
- Collection (shelve) organization
- Pomodoro timer
- Manual test creation
- Flashcard review system

### In Development (🔄)

- AI-powered test generation from topics
- Document upload and parsing
- AI content extraction
- Spring AI integration

### Planned (📋)

- Resource library with PDF viewer
- Community deck marketplace
- Advanced analytics
- Calendar integration
- Offline support

## 📖 Documentation Standards

All documentation follows these principles:

1. **Accuracy** - Reflects actual implementation status
2. **Completeness** - Covers all major features and APIs
3. **Clarity** - Written for the target audience
4. **Currency** - Updated with code changes
5. **Examples** - Includes code samples and use cases

## 🔄 Keeping Documentation Updated

When making changes to the project:

1. **Code Changes** → Update relevant technical docs (API.md, ARCHITECTURE.md)
2. **New Features** → Add to FEATURES.md with status indicator
3. **UI Changes** → Update screen.md and theme-color.md
4. **Vision Changes** → Update initiative.md and story.md

## 📝 Contributing to Documentation

To improve these docs:

1. Identify gaps or inaccuracies
2. Create a pull request with updates
3. Ensure consistency with existing style
4. Update this index if adding new documents

## 📧 Questions?

For documentation feedback or questions:

- Create an issue on GitHub
- Tag with `documentation` label
- Reference specific doc file and section

---

**Last Updated:** 2026-01-31  
**Documentation Version:** 1.0
