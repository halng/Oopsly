# Oopsly API Documentation

## Overview

The Oopsly API is a RESTful API built with Spring Boot 3.x and Java 21. It provides comprehensive endpoints for managing users, authentication, flashcards, test suites, and study resources.

**Base URL:** `http://localhost:8080` (development)

**API Version:** 1.0

---

## Authentication

### Authentication Method

- **Type:** JWT (JSON Web Token)
- **Header:** `Authorization: Bearer <access_token>`
- **Token Types:**
  - **Access Token**: Short-lived token for API requests
  - **Refresh Token**: Long-lived token for obtaining new access tokens

### Authentication Flow

```text
1. User requests OTP → POST /otp
2. User validates OTP → POST /otp/validate
3. Server returns JWT tokens (access + refresh)
4. User makes authenticated requests with access token
5. When access token expires → POST /users/refresh-token
6. User logs out → POST /users/logout
```

---

## API Response Format

All API responses follow a standard wrapper format:

```json
{
  "isSuccess": true,
  "message": "Operation completed successfully",
  "data": { /* response payload */ },
  "status": 200,
  "timestamp": "2026-01-31T07:52:25.932Z"
}
```

### Error Response Format

```json
{
  "isSuccess": false,
  "message": "Error description",
  "data": null,
  "status": 400,
  "timestamp": "2026-01-31T07:52:25.932Z"
}
```

---

## Authentication Endpoints

### 1. OTP Controller

#### Generate OTP

```http
POST /otp?email=user@example.com
```

**Description:** Generate and send a one-time password to the specified email address.

**Request Parameters:**

- `email` (query parameter, required): Email address to send OTP

**Validation:**

- Email must match pattern: `^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$`

**Response:**

```json
{
  "isSuccess": true,
  "message": "OTP sent successfully",
  "data": null,
  "status": 200
}
```

---

#### Validate OTP

```http
POST /otp/validate
```

**Description:** Verify the OTP and authenticate the user.

**Request Body:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "OTP validated successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "status": 200
}
```

---

### 2. User Controller

#### Refresh Token

```http
POST /users/refresh-token
```

**Description:** Generate new access and refresh tokens using a valid refresh token.

**Request Body:**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_email": "user@example.com"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  },
  "status": 200
}
```

---

#### Logout

```http
POST /users/logout
```

**Description:** Invalidate the refresh token and log out the user.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Logged out successfully",
  "data": null,
  "status": 200
}
```

---

## User Profile Endpoints

### 3. User Profile Controller

#### Get User Profile

```http
GET /user/profile
```

**Description:** Retrieve the authenticated user's profile information.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "avatarUrl": "https://...",
    "createdAt": "2026-01-01T00:00:00Z",
    "settings": {
      "theme": "dark",
      "notifications": true
    }
  }
}
```

---

#### Update User Profile

```http
PATCH /user/profile
```

**Description:** Update user profile information.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "displayName": "John Doe Updated",
  "avatarUrl": "https://..."
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe Updated",
    "avatarUrl": "https://..."
  }
}
```

---

#### Update Settings

```http
PATCH /user/settings
```

**Description:** Update application settings for the user.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "theme": "light",
  "notifications": true,
  "dailyGoal": 30,
  "reminderTime": "09:00"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Settings updated successfully"
}
```

---

## Shelve Management Endpoints

### 4. Shelve Controller

Shelves are top-level collections that contain subjects and test suites.

#### Create Shelve

```http
POST /shelves
```

**Description:** Create a new shelve (collection).

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "Biology Collection",
  "description": "All biology study materials",
  "color": "#8BC34A",
  "icon": "microscope"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Shelve created successfully",
  "data": {
    "id": "uuid",
    "name": "Biology Collection",
    "description": "All biology study materials",
    "color": "#8BC34A",
    "icon": "microscope",
    "createdAt": "2026-01-31T07:52:25.932Z"
  }
}
```

---

#### Get All Shelves

```http
GET /shelves?page=0&size=20
```

**Description:** Retrieve a paginated list of shelves.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 0)
- `size` (optional): Items per page (default: 20)

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "name": "Biology Collection",
        "description": "All biology study materials",
        "subjectCount": 5,
        "testSuiteCount": 3
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 10,
    "totalPages": 1
  }
}
```

---

#### Get Shelve by ID

```http
GET /shelves/{id}
```

**Description:** Retrieve a specific shelve by its ID.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "name": "Biology Collection",
    "description": "All biology study materials",
    "color": "#8BC34A",
    "icon": "microscope",
    "subjects": [],
    "testSuites": [],
    "createdAt": "2026-01-31T07:52:25.932Z",
    "updatedAt": "2026-01-31T07:52:25.932Z"
  }
}
```

---

#### Update Shelve

```http
PUT /shelves/{id}
```

**Description:** Update shelve information.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "Advanced Biology",
  "description": "Updated description",
  "color": "#4CAF50"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Shelve updated successfully",
  "data": {
    "id": "uuid",
    "name": "Advanced Biology",
    "description": "Updated description"
  }
}
```

---

#### Delete Shelve

```http
PATCH /shelves/{id}
```

**Description:** Soft delete a shelve (marks as deleted, can be recovered).

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Shelve deleted successfully"
}
```

---

## Subject Management Endpoints

### 5. Subject Controller

Subjects are collections of flashcards within a shelve.

#### Create Subject

```http
POST /shelves/{shelveId}/subjects
```

**Description:** Create a new subject within a shelve.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "Cell Biology",
  "description": "Study of cell structure and function",
  "color": "#03A9F4"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Subject created successfully",
  "data": {
    "id": "uuid",
    "name": "Cell Biology",
    "description": "Study of cell structure and function",
    "shelveId": "uuid",
    "cardCount": 0
  }
}
```

---

#### Get All Subjects

```http
GET /shelves/{shelveId}/subjects?page=0&size=20
```

**Description:** Retrieve paginated subjects for a shelve.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 0)
- `size` (optional): Items per page (default: 20)

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "name": "Cell Biology",
        "cardCount": 25,
        "lastReviewed": "2026-01-30T10:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1
  }
}
```

---

#### Get Subject by ID

```http
GET /shelves/{shelveId}/subjects/{id}
```

**Description:** Retrieve a specific subject.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "name": "Cell Biology",
    "description": "Study of cell structure and function",
    "shelveId": "uuid",
    "cards": [],
    "statistics": {
      "totalCards": 25,
      "masteredCards": 10,
      "learningCards": 15
    }
  }
}
```

---

#### Update Subject

```http
PUT /shelves/{shelveId}/subjects/{id}
```

**Description:** Update subject information.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "Advanced Cell Biology",
  "description": "Updated description"
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Subject updated successfully"
}
```

---

#### Delete Subject

```http
PATCH /shelves/{shelveId}/subjects/{id}
```

**Description:** Soft delete a subject (cascades to all cards).

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Subject and associated cards deleted successfully"
}
```

---

## Flashcard Endpoints

### 6. Card Controller

Cards are individual flashcards within a subject.

#### Create Cards

```http
POST /shelves/{shelveId}/subjects/{subjectId}/cards
```

**Description:** Create one or more flashcards for a subject.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "cards": [
    {
      "front": "What is mitochondria?",
      "back": "The powerhouse of the cell",
      "difficulty": "EASY",
      "tags": ["biology", "cell"]
    }
  ]
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Cards created successfully",
  "data": {
    "createdCount": 1,
    "cards": [
      {
        "id": "uuid",
        "front": "What is mitochondria?",
        "back": "The powerhouse of the cell",
        "difficulty": "EASY"
      }
    ]
  }
}
```

---

#### Get All Cards

```http
GET /shelves/{shelveId}/subjects/{subjectId}/cards?page=0&size=20
```

**Description:** Retrieve paginated cards for a subject.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 0)
- `size` (optional): Items per page (default: 20)

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "content": [
      {
        "id": "uuid",
        "front": "What is mitochondria?",
        "back": "The powerhouse of the cell",
        "difficulty": "EASY",
        "nextReview": "2026-02-01T00:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 25,
    "totalPages": 2
  }
}
```

---

#### Get Card by ID

```http
GET /shelves/{shelveId}/subjects/{subjectId}/cards/{id}
```

**Description:** Retrieve a specific card.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "front": "What is mitochondria?",
    "back": "The powerhouse of the cell",
    "difficulty": "EASY",
    "tags": ["biology", "cell"],
    "reviewHistory": [],
    "nextReview": "2026-02-01T00:00:00Z",
    "createdAt": "2026-01-31T07:52:25.932Z"
  }
}
```

---

#### Update Card

```http
PUT /shelves/{shelveId}/subjects/{subjectId}/cards/{id}
```

**Description:** Update card content and properties.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "front": "Updated question",
  "back": "Updated answer",
  "difficulty": "MEDIUM",
  "tags": ["biology", "cell", "energy"]
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Card updated successfully"
}
```

---

#### Update Card Difficulty (Batch)

```http
PUT /shelves/{shelveId}/subjects/{subjectId}/cards/difficulty
```

**Description:** Batch update difficulty for multiple cards.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "updates": [
    {
      "cardId": "uuid1",
      "difficulty": "EASY"
    },
    {
      "cardId": "uuid2",
      "difficulty": "HARD"
    }
  ]
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Card difficulties updated successfully",
  "data": {
    "updatedCount": 2
  }
}
```

---

#### Delete Card

```http
PATCH /shelves/{shelveId}/subjects/{subjectId}/cards/{id}
```

**Description:** Soft delete a card.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Card deleted successfully"
}
```

---

## Test Suite Endpoints

### 7. Test Suite Controller

Test suites contain collections of questions for assessments.

#### Create Test Suite

```http
POST /shelves/{shelveId}/test-suites
```

**Description:** Create a new test suite within a shelve.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "title": "Biology Midterm Practice",
  "description": "Practice test for midterm exam",
  "difficulty": "MEDIUM",
  "timeLimit": 60,
  "passingScore": 70
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Test suite created successfully",
  "data": {
    "id": "uuid",
    "title": "Biology Midterm Practice",
    "questionCount": 0,
    "difficulty": "MEDIUM"
  }
}
```

---

#### Get All Test Suites

```http
GET /shelves/{shelveId}/test-suites
```

**Description:** Retrieve all test suites for a shelve.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": [
    {
      "id": "uuid",
      "title": "Biology Midterm Practice",
      "questionCount": 25,
      "difficulty": "MEDIUM",
      "completionRate": 0.75
    }
  ]
}
```

---

#### Get Test Suite by ID

```http
GET /shelves/{shelveId}/test-suites/{id}
```

**Description:** Retrieve a specific test suite with all questions.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "title": "Biology Midterm Practice",
    "description": "Practice test for midterm exam",
    "difficulty": "MEDIUM",
    "timeLimit": 60,
    "passingScore": 70,
    "questions": [],
    "statistics": {
      "totalAttempts": 10,
      "averageScore": 82.5
    }
  }
}
```

---

#### Update Test Suite

```http
PUT /shelves/{shelveId}/test-suites/{id}
```

**Description:** Update test suite properties.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "title": "Updated Title",
  "timeLimit": 90,
  "passingScore": 75
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Test suite updated successfully"
}
```

---

#### Delete Test Suite

```http
DELETE /shelves/{shelveId}/test-suites/{id}
```

**Description:** Soft delete a test suite (cascades to all questions).

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Test suite and associated questions deleted successfully"
}
```

---

## Question Endpoints

### 8. Question Controller

Questions belong to test suites and support multiple question types.

#### Create Question

```http
POST /test-suites/{testSuiteId}/questions
```

**Description:** Create a new question in a test suite.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body (Multiple Choice):**

```json
{
  "questionText": "What is the powerhouse of the cell?",
  "questionType": "MULTIPLE_CHOICE",
  "difficulty": "EASY",
  "points": 10,
  "metadata": {
    "options": [
      "Nucleus",
      "Mitochondria",
      "Ribosome",
      "Golgi Apparatus"
    ],
    "correctAnswer": 1
  }
}
```

**Request Body (True/False):**

```json
{
  "questionText": "Photosynthesis occurs in animals.",
  "questionType": "TRUE_FALSE",
  "difficulty": "EASY",
  "points": 5,
  "metadata": {
    "correctAnswer": false
  }
}
```

**Request Body (Short Answer):**

```json
{
  "questionText": "Explain the process of mitosis.",
  "questionType": "SHORT_ANSWER",
  "difficulty": "HARD",
  "points": 20,
  "metadata": {
    "keywords": ["cell division", "chromosomes", "phases"]
  }
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Question created successfully",
  "data": {
    "id": "uuid",
    "questionText": "What is the powerhouse of the cell?",
    "questionType": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "points": 10
  }
}
```

---

#### Get All Questions

```http
GET /test-suites/{testSuiteId}/questions
```

**Description:** Retrieve all questions for a test suite.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": [
    {
      "id": "uuid",
      "questionText": "What is the powerhouse of the cell?",
      "questionType": "MULTIPLE_CHOICE",
      "difficulty": "EASY",
      "points": 10
    }
  ]
}
```

---

#### Get Question by ID

```http
GET /test-suites/{testSuiteId}/questions/{id}
```

**Description:** Retrieve a specific question with full details.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "data": {
    "id": "uuid",
    "questionText": "What is the powerhouse of the cell?",
    "questionType": "MULTIPLE_CHOICE",
    "difficulty": "EASY",
    "points": 10,
    "metadata": {
      "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi Apparatus"],
      "correctAnswer": 1
    },
    "createdAt": "2026-01-31T07:52:25.932Z"
  }
}
```

---

#### Update Question

```http
PUT /test-suites/{testSuiteId}/questions/{id}
```

**Description:** Update question content and properties.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "questionText": "Updated question text",
  "difficulty": "MEDIUM",
  "points": 15
}
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Question updated successfully"
}
```

---

#### Delete Question

```http
DELETE /test-suites/{testSuiteId}/questions/{id}
```

**Description:** Soft delete a question.

**Headers:**

```text
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "isSuccess": true,
  "message": "Question deleted successfully"
}
```

---

## Data Models

### Enums

#### Difficulty Levels

```text
EASY, MEDIUM, HARD
```

#### Question Types

```text
MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER
```

**Note:** `FILL_IN_BLANK` is planned for future implementation.

---

## Error Codes

| Code           | Description               |
| -------------- | ------------------------- |
| `AUTH_001`     | Invalid or expired token  |
| `AUTH_002`     | Invalid OTP               |
| `AUTH_003`     | OTP expired               |
| `VALID_001`    | Validation error          |
| `VALID_002`    | Invalid email format      |
| `NOT_FOUND`    | Resource not found        |
| `FORBIDDEN`    | Access denied             |
| `CONFLICT`     | Resource already exists   |
| `SERVER_ERROR` | Internal server error     |

---

## Rate Limiting

- **Rate Limit:** 100 requests per minute per user
- **Burst Limit:** 20 requests per second
- **Headers:**
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Pagination

All list endpoints support pagination with these parameters:

- `page`: Page number (0-indexed, default: 0)
- `size`: Items per page (default: 20, max: 100)

Response includes:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5,
  "first": true,
  "last": false
}
```

---

## Best Practices

1. **Always include Authorization header** for protected endpoints
2. **Use HTTPS** in production
3. **Handle token expiration** gracefully with refresh tokens
4. **Implement retry logic** for network failures
5. **Cache responses** when appropriate
6. **Use pagination** for large datasets
7. **Validate input** on the client side before sending requests
8. **Handle errors** according to HTTP status codes and error codes

---

## SDK Support

Official SDKs are planned for:

- JavaScript/TypeScript (React Native)
- Python
- Java
- Swift (iOS)
- Kotlin (Android)

---

## OpenAPI/Swagger

Interactive API documentation is available at:

```text
http://localhost:8080/swagger-ui.html
```

OpenAPI specification:

```text
http://localhost:8080/v3/api-docs
```

---

## Support

For API support and bug reports:

- GitHub Issues: <https://github.com/halng/Oopsly/issues>
- Email: <support@oopsly.app> (if available)

---

**Last Updated:** 2026-01-31
