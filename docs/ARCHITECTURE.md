# Oopsly Architecture Documentation

## Overview

Oopsly (Osmosis) is a cross-platform learning application built with a modern, scalable architecture. The system follows a three-tier architecture with a mobile frontend, RESTful backend API, and PostgreSQL database.

---

## System Architecture

### High-Level Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  React Native Cross-Platform App (iOS/Android/Web)           │
│  - Expo Framework                                            │
│  - TypeScript                                                │
│  - NativeWind (Tailwind CSS)                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS/REST
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                    API Gateway Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Spring Boot REST API                                        │
│  - Controllers (Routing)                                     │
│  - JWT Authentication                                        │
│  - Request Validation                                        │
│  - Response Formatting                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Service Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Services                                     │
│  - User Management                                           │
│  - OTP Authentication                                        │
│  - Card/Question Management                                  │
│  - Test Suite Management                                     │
│  - AI Integration (Spring AI)                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Data Access Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Spring Data JPA Repositories                                │
│  - Entity Management                                         │
│  - Query Optimization                                        │
│  - Transaction Management                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                   Database Layer                             │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                         │
│  - Relational Data Storage                                   │
│  - ACID Transactions                                         │
│  - pgvector (for embeddings, planned)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (Mobile Application)

| Component     | Technology                   | Version | Purpose                               |
| ------------- | ---------------------------- | ------- | ------------------------------------- |
| **Framework** | React Native                 | Latest  | Cross-platform mobile development     |
| **Platform**  | Expo                         | Latest  | Development tooling and build system  |
| **Language**  | TypeScript                   | Latest  | Type-safe JavaScript                  |
| **Styling**   | NativeWind                   | Latest  | Tailwind CSS for React Native         |
| **Routing**   | Expo Router                  | Latest  | File-based navigation                 |
| **State**     | Zustand                      | Latest  | Lightweight state management          |
| **HTTP**      | Axios                        | Latest  | API communication                     |
| **Icons**     | Lucide Icons                 | Latest  | SVG icon library                      |
| **Testing**   | Jest + React Testing Library | Latest  | Unit and integration testing          |

**Key Frontend Features:**

- Cross-platform support (iOS, Android, Web)
- Type-safe development with TypeScript
- Hot reload for fast development
- Native performance with Expo
- Responsive design with NativeWind

### Backend (API Server)

| Component      | Technology             | Version          | Purpose                              |
| -------------- | ---------------------- | ---------------- | ------------------------------------ |
| **Framework**  | Spring Boot            | 3.5.8            | Application framework                |
| **Language**   | Java                   | 21               | Programming language                 |
| **API Style**  | REST                   | -                | HTTP-based API                       |
| **ORM**        | Spring Data JPA        | Latest           | Database abstraction                 |
| **Security**   | Spring Security        | Latest           | Authentication & authorization       |
| **AI**         | Spring AI              | Latest (planned) | AI/ML integration (in development)   |
| **Build Tool** | Gradle                 | Latest           | Build automation                     |
| **API Docs**   | SpringDoc OpenAPI      | Latest           | Auto-generated API documentation     |

**Key Backend Features:**

- RESTful API design
- JWT-based authentication
- OTP email verification
- Soft delete pattern
- Hierarchical data structure
- Comprehensive validation
- Transaction management

### Database

| Component      | Technology                 | Purpose                      |
| -------------- | -------------------------- | ---------------------------- |
| **RDBMS**      | PostgreSQL                 | Primary data store           |
| **ORM**        | JPA/Hibernate              | Object-relational mapping    |
| **Migration**  | Flyway/Liquibase (planned) | Schema version control       |
| **Extensions** | pgvector (planned)         | Vector embeddings for AI     |

### Testing Infrastructure

| Component               | Technology            | Purpose                                          |
| ----------------------- | --------------------- | ------------------------------------------------ |
| **UI Testing**          | Jest                  | Unit testing                                     |
| **UI Testing**          | React Testing Library | Component testing                                |
| **API Testing**         | JUnit                 | Unit testing                                     |
| **API Testing**         | Mockito               | Mocking framework                                |
| **Integration Testing** | Pytest                | Integration testing (separate test/ folder)      |
| **E2E Testing**         | Playwright            | End-to-end testing (separate test/ folder)       |

### DevOps & Infrastructure

| Component            | Technology                 | Purpose                        |
| -------------------- | -------------------------- | ------------------------------ |
| **Containerization** | Docker                     | Application packaging          |
| **Orchestration**    | Docker Compose             | Local development              |
| **Version Control**  | Git                        | Source code management         |
| **CI/CD**            | GitHub Actions (planned)   | Automated testing & deployment |
| **Hosting**          | Google Cloud Run (planned) | Serverless deployment          |

---

## Project Structure

### Frontend Structure

```text
ui/
├── app/                          # Expo Router pages
│   ├── (user)/                   # Authenticated routes
│   │   ├── auth.tsx              # Authentication screen
│   │   ├── home.tsx              # Home dashboard
│   │   ├── flash-card-review.tsx # Flashcard review
│   │   ├── test-taking.tsx       # Test execution
│   │   ├── test-result.tsx       # Test results
│   │   ├── profile.tsx           # User profile
│   │   ├── statistics.tsx        # Analytics
│   │   ├── pomodoro.tsx          # Pomodoro timer
│   │   ├── notes.tsx             # Note-taking
│   │   ├── study-planner.tsx     # Study planning
│   │   ├── goal-tracker.tsx      # Goal tracking
│   │   ├── shelf-management.tsx # Collection management
│   │   └── ...                   # Other screens
│   ├── index.tsx                 # Landing page
│   ├── onboard.tsx               # Onboarding flow
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable components
├── hooks/                        # Custom React hooks
├── services/                     # API services
├── store/                        # State management (Zustand)
├── types/                        # TypeScript types
├── utils/                        # Utility functions
├── assets/                       # Images, fonts, etc.
└── constants/                    # App constants
```

### Backend Structure

```text
api/
├── src/
│   ├── main/
│   │   ├── java/com/app/oopsly/api/
│   │   │   ├── controller/          # REST controllers
│   │   │   │   ├── UserController.java
│   │   │   │   ├── OTPController.java
│   │   │   │   ├── CardController.java
│   │   │   │   ├── QuestionController.java
│   │   │   │   ├── TestSuiteController.java
│   │   │   │   ├── ShelfController.java
│   │   │   │   ├── SubjectController.java
│   │   │   │   └── UserProfileController.java
│   │   │   ├── service/             # Business logic
│   │   │   │   ├── UserService.java
│   │   │   │   ├── OTPService.java
│   │   │   │   ├── CardService.java
│   │   │   │   └── ...
│   │   │   ├── repository/          # Data access
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── CardRepository.java
│   │   │   │   └── ...
│   │   │   ├── model/               # Entity models
│   │   │   │   ├── User.java
│   │   │   │   ├── Card.java
│   │   │   │   ├── Question.java
│   │   │   │   └── ...
│   │   │   ├── dto/                 # Data transfer objects
│   │   │   ├── config/              # Configuration classes
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── JwtConfig.java
│   │   │   │   └── ...
│   │   │   ├── exception/           # Exception handling
│   │   │   └── util/                # Utility classes
│   │   └── resources/
│   │       ├── application.yml      # App configuration
│   │       └── application-prod.yml # Production config
│   └── test/                        # Test files
│       └── java/com/app/oopsly/api/
│           ├── controller/          # Controller tests
│           ├── service/             # Service tests
│           └── repository/          # Repository tests
├── build.gradle                     # Build configuration
└── Dockerfile                       # Docker configuration
```

## Data Models

### Entity Relationship Diagram

```text
┌─────────────┐
│    User     │
└──────┬──────┘
       │ 1:N
       │
┌──────▼──────┐
│   Shelf    │ (Top-level collection)
└──────┬──────┘
       │ 1:N
       ├────────────────────────┐
       │                        │
┌──────▼──────┐         ┌──────▼──────┐
│   Subject   │         │ Test Suite  │
└──────┬──────┘         └──────┬──────┘
       │ 1:N                   │ 1:N
       │                       │
┌──────▼──────┐         ┌──────▼──────┐
│    Card     │         │  Question   │
└─────────────┘         └─────────────┘
```

### Core Entities

#### User

```java
User {
  UUID id
  String email (unique)
  String displayName
  String avatarUrl
  Timestamp createdAt
  Timestamp updatedAt
  Boolean isActive
  Settings settings
}
```

#### Shelf (Collection)

```java
Shelf {
  UUID id
  UUID userId (foreign key)
  String name
  String description
  String color
  String icon
  Boolean isDeleted
  Timestamp createdAt
  Timestamp updatedAt
  List<Subject> subjects
  List<TestSuite> testSuites
}
```

#### Subject

```java
Subject {
  UUID id
  UUID shelfId (foreign key)
  String name
  String description
  String color
  Boolean isDeleted
  Timestamp createdAt
  Timestamp updatedAt
  List<Card> cards
}
```

#### Card (Flashcard)

```java
Card {
  UUID id
  UUID subjectId (foreign key)
  String front
  String back
  Enum difficulty (EASY, MEDIUM, HARD)
  List<String> tags
  Timestamp nextReview
  Integer reviewCount
  Boolean isDeleted
  Timestamp createdAt
  Timestamp updatedAt
}
```

#### TestSuite

```java
TestSuite {
  UUID id
  UUID shelfId (foreign key)
  String title
  String description
  Enum difficulty
  Integer timeLimit (minutes)
  Integer passingScore
  Boolean isDeleted
  Timestamp createdAt
  Timestamp updatedAt
  List<Question> questions
}
```

#### Question

```java
Question {
  UUID id
  UUID testSuiteId (foreign key)
  String questionText
  Enum questionType (MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER)
  Enum difficulty
  Integer points
  JSON metadata (type-specific data)
  Boolean isDeleted
  Timestamp createdAt
  Timestamp updatedAt
}
```

---

## API Design Patterns

### RESTful Conventions

1. **Hierarchical URLs**: Reflect data relationships

   ```text
   /shelfs/{shelfId}/subjects/{subjectId}/cards/{cardId}
   ```

2. **HTTP Methods**: Standard CRUD operations
   - `GET`: Retrieve resources
   - `POST`: Create resources
   - `PUT`: Full update
   - `PATCH`: Soft delete (mark as deleted)

3. **Standard Response Format**:

   ```json
   {
     "isSuccess": boolean,
     "message": string,
     "data": object,
     "status": number,
     "timestamp": ISO-8601
   }
   ```

4. **Pagination**: Query parameters for lists

   ```text
   ?page=0&size=20
   ```

5. **Soft Deletes**: Use `PATCH` to mark as deleted
   - Preserves data integrity
   - Allows recovery
   - Cascading deletes propagate

---

## Security Architecture

### Authentication Flow

```text
1. User enters email → POST /otp
2. System sends OTP to email
3. User enters OTP → POST /otp/validate
4. System returns JWT tokens:
   - Access Token (short-lived, 1 hour)
   - Refresh Token (long-lived, 30 days)
5. Client includes access token in requests:
   Authorization: Bearer <access_token>
6. When access token expires → POST /users/refresh-token
7. System validates refresh token
8. System returns new token pair
```

### Security Layers

1. **Transport Security**: HTTPS only in production
2. **Authentication**: JWT-based token authentication
3. **Authorization**: Role-based access control (planned)
4. **Input Validation**: Request validation at controller layer
5. **Output Encoding**: XSS prevention
6. **SQL Injection**: JPA parameter binding
7. **CORS**: Configured for allowed origins
8. **Rate Limiting**: Protection against abuse (planned)

### Token Structure

**Access Token:**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1706688745,
  "exp": 1706692345,
  "type": "access"
}
```

**Refresh Token:**

```json
{
  "sub": "user-uuid",
  "iat": 1706688745,
  "exp": 1709280745,
  "type": "refresh"
}
```

---

## State Management

### Frontend State (Zustand)

```typescript
// Auth Store
{
  user: User | null,
  accessToken: string | null,
  refreshToken: string | null,
  isAuthenticated: boolean,
  login: (tokens) => void,
  logout: () => void
}

// Shelf Store
{
  shelfs: Shelf[],
  currentShelf: Shelf | null,
  fetchShelfs: () => Promise<void>,
  createShelf: (data) => Promise<void>
}

// Card Store
{
  cards: Card[],
  reviewQueue: Card[],
  currentCard: Card | null,
  updateDifficulty: (id, difficulty) => void
}
```

### Backend State

- **Session State**: Stored in JWT tokens (stateless)
- **Database State**: Persistent data in PostgreSQL
- **Cache**: Planned (Redis for session management)

---

## Performance Considerations

### Frontend Optimization

1. **Code Splitting**: Lazy load screens with Expo Router
2. **Image Optimization**: Compressed assets, lazy loading
3. **API Caching**: Cache GET requests with stale-while-revalidate
4. **Virtualized Lists**: Use FlatList for large datasets
5. **Memoization**: React.memo for expensive components

### Backend Optimization

1. **Database Indexing**: Indexes on frequently queried fields
2. **Connection Pooling**: Efficient database connections
3. **Query Optimization**: N+1 query prevention with JPA fetch strategies
4. **Pagination**: Limit result set sizes
5. **Caching**: Planned (Redis for frequent reads)

### Database Optimization

1. **Indexes**: Primary keys (UUID), foreign keys, frequently queried fields
2. **Soft Deletes**: Filter with `isDeleted = false`
3. **Denormalization**: Planned (for analytics)
4. **Partitioning**: Future consideration for large datasets

---

## Deployment Architecture

### Development Environment

```text
┌────────────────┐
│  Developer PC  │
├────────────────┤
│ - Expo Go      │
│ - Docker       │
│ - PostgreSQL   │
└────────────────┘
```

### Production Environment (Planned)

```text
┌─────────────────────────────────────────┐
│         Google Cloud Platform            │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐   │
│  │   Google Cloud Run               │   │
│  │   - Spring Boot API (GraalVM)    │   │
│  │   - Auto-scaling                 │   │
│  │   - Scale to Zero                │   │
│  └──────────────┬───────────────────┘   │
│                 │                        │
│  ┌──────────────▼───────────────────┐   │
│  │   Cloud SQL (PostgreSQL)         │   │
│  │   - Managed database             │   │
│  │   - Automated backups            │   │
│  └──────────────────────────────────┘   │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │   Cloud Storage                  │   │
│  │   - Static assets                │   │
│  │   - User uploads                 │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Cost Optimization:**

- GraalVM Native Image: Fast startup, scale to zero
- Smallest Cloud SQL instance for text/vectors
- Free tier for light usage
- Estimated cost: ~$21.50/month

---

## API Integration Points

### External Services

1. **Email Service**: OTP delivery
   - SMTP integration
   - Email templates
   - Delivery tracking

2. **AI Service**: Spring AI integration (in development)
   - Gemini 1.5 Flash for text generation (planned)
   - Question generation from topics
   - Document content extraction
   - Context-aware question creation
   - Cost control with rate limiting
   - **Status**: Dependencies configured but not yet integrated

3. **Storage Service**: File uploads (planned)
   - Cloud Storage for documents
   - PDF processing capabilities
   - Image optimization
   - CDN delivery

---

## Monitoring & Observability (Planned)

### Logging

- **Frontend**: Console logging, error tracking
- **Backend**: Structured logging (Logback)
- **Database**: Query logging for slow queries

### Metrics

- API response times
- Error rates
- User activity
- Database performance

### Error Tracking

- Sentry or similar service
- Client-side error reporting
- Server-side exception tracking

---

## Scalability Considerations

### Current Scale

- Target: 1,000+ active users
- Architecture supports horizontal scaling

### Future Scaling Strategy

1. **Database Scaling**:
   - Read replicas for heavy read operations
   - Connection pooling optimization
   - Query optimization

2. **Application Scaling**:
   - Horizontal scaling with Cloud Run
   - Load balancing
   - Stateless design enables easy scaling

3. **Caching**:
   - Redis for session management
   - CDN for static assets
   - API response caching

4. **Microservices** (if needed):
   - Separate AI service
   - Separate analytics service
   - Message queue for async operations

---

## Development Workflow

### Local Development

1. **Prerequisites**:

   ```bash
   - Node.js 18+
   - Java 21
   - Docker & Docker Compose
   - Expo CLI
   - Android Studio / Xcode (for mobile testing)
   ```

2. **Setup**:

   ```bash
   # Backend
   cd api
   ./gradlew bootRun
   
   # Frontend
   cd ui
   npm install
   npx expo start
   
   # Database
   docker-compose up postgres
   ```

3. **Testing**:

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

### CI/CD Pipeline (Planned)

```text
┌─────────────┐
│  Git Push   │
└──────┬──────┘
       │
┌──────▼──────┐
│   GitHub    │
│   Actions   │
└──────┬──────┘
       │
       ├─── Lint & Format Check
       ├─── Unit Tests
       ├─── Integration Tests
       ├─── Security Scan
       ├─── Build Docker Image
       └─── Deploy to Cloud Run
```

---

## Design Principles

1. **Separation of Concerns**: Clear layer boundaries
2. **RESTful Design**: Standard HTTP semantics
3. **Stateless API**: JWT-based authentication
4. **Soft Deletes**: Data preservation
5. **Type Safety**: TypeScript on frontend, Java on backend
6. **Test Coverage**: Comprehensive testing at all layers
7. **Security First**: Authentication, validation, encryption
8. **Performance**: Pagination, caching, optimization
9. **Scalability**: Horizontal scaling capability
10. **Maintainability**: Clean code, documentation, testing

---

## Future Architectural Enhancements

### Planned Improvements

1. **Microservices Architecture** (if scale demands):
   - API Gateway
   - User Service
   - Content Service
   - AI Service
   - Analytics Service

2. **Event-Driven Architecture**:
   - Message queue (RabbitMQ/Kafka)
   - Async processing
   - Event sourcing

3. **Advanced Caching**:
   - Redis for session management
   - CDN for static content
   - API response caching

4. **Real-time Features**:
   - WebSocket support
   - Live collaboration
   - Real-time notifications

5. **Advanced Analytics**:
   - Data warehouse
   - Business intelligence
   - Machine learning insights
