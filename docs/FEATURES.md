# Oopsly (Osmosis) - Features Documentation

## Overview

Oopsly (formerly Osmosis) is a comprehensive learning platform that combines intelligent test generation, flashcard management, and study planning to help students learn more effectively. The application supports both AI-powered content generation (in development) and manual creation, with robust progress tracking and analytics.

## Implementation Status

**Legend:**
- ✅ **Fully Implemented**: Feature is complete with both UI and backend
- 🔄 **In Development**: UI completed, backend API in progress
- 📋 **Planned**: Feature is designed but not yet implemented

---

## Core Features

### 1. User Management & Authentication ✅

#### 1.1 OTP-Based Authentication ✅
- **Email-based OTP system**: Secure passwordless authentication
- **OTP Generation**: Send one-time passwords to registered email addresses
- **OTP Validation**: Verify OTP codes for secure login
- **Email Format Validation**: Ensures valid email format (RFC 5322 compliant)

#### 1.2 Session Management
- **JWT Token Authentication**: Secure access token-based authentication
- **Refresh Tokens**: Long-lived tokens for seamless session renewal
- **Token Refresh**: Generate new access tokens without re-authentication
- **Logout**: Secure token invalidation

#### 1.3 User Profiles
- **Profile Management**: View and update user profile information
- **Settings Management**: Customize application preferences
- **User Personalization**: Store study preferences and goals

---

### 2. Test & Quiz Generation

#### 2.1 Multiple Creation Methods

**A. Topic-Based Generation (AI-Powered) - 🔄 In Development**
- Input a topic or subject area
- AI generates relevant questions automatically
- Customizable difficulty levels
- Adjustable question count (1-50 questions)
- **Status:** UI implemented, backend AI integration in development

**B. Document Upload Generation - 🔄 In Development**
- Upload documents (PDF, images, etc.)
- AI extracts content and generates questions
- Automatic topic identification
- Context-aware question generation
- **Status:** UI implemented, backend document processing in development

**C. Manual Test Creation ✅**
- Create custom questions from scratch
- Full control over question content
- Support for multiple question types

#### 2.2 Question Types & Configuration

**Supported Question Types:**
- Multiple Choice Questions (MCQ)
- True/False Questions
- Short Answer Questions

**Note:** Fill-in-the-blank (Cloze) is planned for future implementation.

**Configuration Options:**
- Question count: 1-50 questions per test
- Difficulty levels: Easy, Medium, Hard
- Custom test titles and descriptions
- Type-specific metadata validation

#### 2.3 Test Management

**Test Suite Features:**
- Create and organize multiple test suites
- Hierarchical structure: Shelve → Test Suite → Questions
- Update existing tests
- Soft delete (recoverable)
- Cascading operations (deleting test suite removes all questions)

---

### 3. Flashcard System ✅

#### 3.1 Card Management ✅

**Card Creation:**
- Create individual flashcards
- Organize cards by subject
- Rich content support (text, images)
- Hierarchical organization: Shelve → Subject → Cards

**Card Features:**
- Front/back content
- Difficulty tracking
- Review scheduling
- Batch difficulty updates
- Soft delete with recovery

#### 3.2 Study & Review

**Review Modes:**
- Standard flashcard review
- Spaced repetition algorithm
- Difficulty-based scheduling
- Progress tracking per card

**Review Features:**
- Swipe gestures for interaction
- Confidence rating system
- Session statistics
- Review history tracking

#### 3.3 Difficulty System
- Easy, Medium, Hard classifications
- User-determined difficulty
- Batch difficulty updates
- Adaptive scheduling based on difficulty

---

### 4. Collections & Shelves ✅

#### 4.1 Shelve Management ✅

**Organization:**
- Create collections (shelves) for related content
- Organize subjects within shelves
- Organize test suites within shelves
- Hierarchical content structure

**Shelve Features:**
- Create, read, update, delete (CRUD) operations
- Pagination support for large collections
- Soft delete with recovery
- UUID-based unique identification

#### 4.2 Subject Management

**Subject Organization:**
- Create subjects within shelves
- Group related flashcards by subject
- Subject-level statistics
- Cascading deletes (removes all cards)

**Features:**
- Paginated subject listings
- Subject-specific card management
- Update subject metadata
- Soft delete with cascading

#### 4.3 Sharing & Collaboration
- Share shelves with other users
- Collaborative study collections
- Access control and permissions

---

### 5. Study Tools

#### 5.1 Pomodoro Timer (Focus Flow) ✅

**Timer Features:**
- 25-minute focus sessions
- 5-minute break intervals
- Visual countdown display
- Session completion tracking

**Focus Mode:**
- Minimalist interface
- Distraction reduction
- Screen wake lock (stays on)
- Session statistics

#### 5.2 Study Planning

**Planning Features:**
- Weekly timetable creation
- Calendar integration support
- Time blocking
- Study session scheduling
- Color-coded activities

**Planning Tools:**
- Drag-and-drop interface
- Multiple study types (lecture, self-study, exam prep)
- Sync with external calendars
- Deadline tracking

#### 5.3 Goal Tracking

**Goal Management:**
- Set daily study goals
- Track goal completion
- Goal details and progress
- Streak tracking
- Achievement system

**Goal Features:**
- Customizable targets
- Progress visualization
- Goal history
- Motivational feedback

---

### 6. Progress Tracking & Analytics

#### 6.1 Statistics & Metrics

**Available Metrics:**
- Total study time
- Cards reviewed
- Tests completed
- Success rates
- Retention rates
- Subject-wise breakdown

#### 6.2 Visual Analytics

**Visualization Options:**
- Progress charts
- Heatmaps (study consistency)
- Forgetting curve visualization
- Time distribution graphs
- Subject performance comparison

#### 6.3 Performance Tracking

**Tracking Features:**
- Session-by-session history
- Test results archive
- Card review history
- Difficulty progression
- Improvement trends

---

### 7. Task Management

#### 7.1 Task Features
- Create and manage study tasks
- Task prioritization (High, Medium, Low)
- Subtasks and checklists
- Task-to-deck linking
- Due date tracking

#### 7.2 Task Organization
- Task list view
- Filter and sort options
- Task completion tracking
- Overdue task alerts

---

### 8. Note-Taking System

#### 8.1 Note Features
- Rich text note creation
- Markdown support
- Note organization
- Search functionality
- Export capabilities

#### 8.2 Integration
- Link notes to flashcards
- Link notes to subjects
- Bi-directional linking
- Context-aware note suggestions

---

### 9. Document Management

#### 9.1 Document Upload - 🔄 In Development
- PDF upload and processing
- Image upload support
- Document parsing for content extraction
- AI-powered content analysis
- **Status:** UI implemented, backend API in development

#### 9.2 Resource Library - 📋 Planned
- File management for uploaded documents
- PDF viewer integration
- Highlight-to-flashcard creation
- Document organization
- **Status:** Planned for future implementation

---

### 10. Test Taking

#### 10.1 Test Execution
- Interactive test-taking interface
- Question navigation
- Answer submission
- Timer support
- Progress saving

#### 10.2 Test Results
- Immediate feedback
- Score calculation
- Question-by-question review
- Performance analysis
- Retry options

---

## Technical Features

### API Architecture
- RESTful API design
- Hierarchical resource structure
- Standard response wrapper (ApiRes)
- UUID-based identifiers
- Pagination support
- Soft delete pattern

### Data Management
- Cascading operations
- Relationship integrity
- Efficient querying
- Batch operations support

### Security
- JWT-based authentication
- Refresh token mechanism
- Email validation
- Secure OTP delivery
- Role-based access control (planned)

### Performance
- Paginated endpoints
- Efficient data loading
- Optimized queries
- Caching support

---

## User Experience Features

### Interface Design
- Clean, modern mobile interface
- Intuitive navigation
- Gesture-based controls
- Haptic feedback
- Dark/light theme support

### Onboarding
- Guided walkthrough
- Demo content
- Quick start tutorial
- Personalization questions

### Notifications
- Study reminders
- Goal achievement alerts
- Review due notifications
- System updates

### Accessibility
- Text-to-speech support
- Screen reader compatibility
- Adjustable text sizes
- High contrast options

---

## Future Features (Roadmap)

Based on existing screen specifications and architecture documents:

### Planned Features
1. **Community Decks**: Marketplace for shared study content
2. **AI Assistant**: Socratic tutoring and context-aware help
3. **Advanced Analytics**: Retention curves and predictive insights
4. **Calendar Sync**: Google/Apple Calendar integration
5. **Offline Support**: Full offline-first architecture
6. **Social Features**: Study groups and collaborative learning
7. **Advanced AI**: Document scanning and semantic search
8. **Exam Tracker**: Comprehensive exam preparation tools
9. **Resource Library**: Advanced PDF annotation and highlighting

---

## Platform Support

### Mobile Platforms
- iOS (via React Native/Expo)
- Android (via React Native/Expo)
- Web (via Expo Web, planned)

### Backend
- Cross-platform REST API
- PostgreSQL database
- Spring Boot 3.x framework
- Java 21 runtime

---

## Getting Started

To use these features:

1. **Sign Up**: Use OTP-based authentication to create an account
2. **Create Collection**: Start by creating a shelve (collection)
3. **Add Content**: Choose from topic generation, document upload, or manual creation
4. **Study**: Use flashcard review, test-taking, or study planning tools
5. **Track Progress**: Monitor your learning with analytics and statistics

For detailed API documentation, see [API.md](./API.md).
For architecture details, see [ARCHITECTURE.md](./ARCHITECTURE.md).
