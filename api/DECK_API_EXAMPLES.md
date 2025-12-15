# Deck API - cURL Examples and Responses

Base URL: `http://localhost:9009/api/v1/osmosis`

All requests require JWT authentication via Bearer token in the Authorization header.

## Authentication

First, obtain a JWT token (example):
```bash
# Login/Get Token (assuming you have OTP authentication)
curl -X POST http://localhost:9009/api/v1/osmosis/otp \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# Validate OTP and get JWT token
curl -X POST http://localhost:9009/api/v1/osmosis/otp/validate \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

**Response:**
```json
{
  "status": 200,
  "message": "OTP validated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "success": true,
  "timestamp": "2025-12-14T23:00:00.000Z"
}
```

---

## 1. Create Deck (POST)

Creates a new deck for the authenticated user.

**Request:**
```bash
curl -X POST http://localhost:9009/api/v1/osmosis/decks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Japanese Vocabulary",
    "description": "Basic Japanese words for beginners"
  }'
```

**Response (HTTP 201 Created):**
```json
{
  "status": 201,
  "message": "Deck created successfully",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Japanese Vocabulary",
    "description": "Basic Japanese words for beginners",
    "createdAt": "2025-12-14T23:00:00.000Z",
    "updatedAt": "2025-12-14T23:00:00.000Z"
  },
  "success": true,
  "timestamp": "2025-12-14T23:00:00.000Z"
}
```

**Create deck without description:**
```bash
curl -X POST http://localhost:9009/api/v1/osmosis/decks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Math Formulas"
  }'
```

**Response (HTTP 201 Created):**
```json
{
  "status": 201,
  "message": "Deck created successfully",
  "data": {
    "id": "a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d",
    "name": "Math Formulas",
    "description": null,
    "createdAt": "2025-12-14T23:01:00.000Z",
    "updatedAt": "2025-12-14T23:01:00.000Z"
  },
  "success": true,
  "timestamp": "2025-12-14T23:01:00.000Z"
}
```

**Error - Missing required field (HTTP 400 Bad Request):**
```bash
curl -X POST http://localhost:9009/api/v1/osmosis/decks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "description": "No name provided"
  }'
```

**Response:**
```json
{
  "status": 400,
  "message": "Name is required",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:02:00.000Z"
}
```

---

## 2. Get All Decks (GET)

Retrieves all active (non-deleted) decks with pagination support.

**Request (default pagination):**
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Decks retrieved successfully",
  "data": {
    "content": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "Japanese Vocabulary",
        "description": "Basic Japanese words for beginners",
        "createdAt": "2025-12-14T23:00:00.000Z",
        "updatedAt": "2025-12-14T23:00:00.000Z"
      },
      {
        "id": "a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d",
        "name": "Math Formulas",
        "description": null,
        "createdAt": "2025-12-14T23:01:00.000Z",
        "updatedAt": "2025-12-14T23:01:00.000Z"
      }
    ],
    "pageable": {
      "pageNumber": 0,
      "pageSize": 10,
      "sort": {
        "sorted": true,
        "unsorted": false,
        "empty": false
      },
      "offset": 0,
      "paged": true,
      "unpaged": false
    },
    "totalElements": 2,
    "totalPages": 1,
    "last": true,
    "size": 10,
    "number": 0,
    "sort": {
      "sorted": true,
      "unsorted": false,
      "empty": false
    },
    "numberOfElements": 2,
    "first": true,
    "empty": false
  },
  "success": true,
  "timestamp": "2025-12-14T23:03:00.000Z"
}
```

**Request (with custom pagination and sorting):**
```bash
curl -X GET "http://localhost:9009/api/v1/osmosis/decks?page=0&size=5&sortBy=name&sortDirection=ASC" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Decks retrieved successfully",
  "data": {
    "content": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "name": "Japanese Vocabulary",
        "description": "Basic Japanese words for beginners",
        "createdAt": "2025-12-14T23:00:00.000Z",
        "updatedAt": "2025-12-14T23:00:00.000Z"
      },
      {
        "id": "a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d",
        "name": "Math Formulas",
        "description": null,
        "createdAt": "2025-12-14T23:01:00.000Z",
        "updatedAt": "2025-12-14T23:01:00.000Z"
      }
    ],
    "totalElements": 2,
    "totalPages": 1,
    "size": 5,
    "number": 0
  },
  "success": true,
  "timestamp": "2025-12-14T23:04:00.000Z"
}
```

**Request (empty result - page beyond available data):**
```bash
curl -X GET "http://localhost:9009/api/v1/osmosis/decks?page=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Decks retrieved successfully",
  "data": {
    "content": [],
    "totalElements": 2,
    "totalPages": 1,
    "size": 10,
    "number": 10,
    "empty": true
  },
  "success": true,
  "timestamp": "2025-12-14T23:05:00.000Z"
}
```

---

## 3. Get Deck by ID (GET)

Retrieves a specific deck by its UUID.

**Request:**
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Deck retrieved successfully",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Japanese Vocabulary",
    "description": "Basic Japanese words for beginners",
    "createdAt": "2025-12-14T23:00:00.000Z",
    "updatedAt": "2025-12-14T23:00:00.000Z"
  },
  "success": true,
  "timestamp": "2025-12-14T23:06:00.000Z"
}
```

**Error - Deck not found (HTTP 404 Not Found):**
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks/99999999-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "status": 404,
  "message": "Deck not found",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:07:00.000Z"
}
```

**Error - Deck is soft deleted (HTTP 404 Not Found):**
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks/deleted-deck-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "status": 404,
  "message": "Deck not found",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:08:00.000Z"
}
```

---

## 4. Update Deck (PUT)

Fully updates an existing deck. User must own the deck.

**Request:**
```bash
curl -X PUT http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Advanced Japanese Vocabulary",
    "description": "Advanced Japanese words and phrases"
  }'
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Deck updated successfully",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Advanced Japanese Vocabulary",
    "description": "Advanced Japanese words and phrases",
    "createdAt": "2025-12-14T23:00:00.000Z",
    "updatedAt": "2025-12-14T23:10:00.000Z"
  },
  "success": true,
  "timestamp": "2025-12-14T23:10:00.000Z"
}
```

**Request (update with null description):**
```bash
curl -X PUT http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Japanese Vocabulary"
  }'
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Deck updated successfully",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "Japanese Vocabulary",
    "description": null,
    "createdAt": "2025-12-14T23:00:00.000Z",
    "updatedAt": "2025-12-14T23:11:00.000Z"
  },
  "success": true,
  "timestamp": "2025-12-14T23:11:00.000Z"
}
```

**Error - User does not own deck (HTTP 403 Forbidden):**
```bash
# User B trying to update User A's deck
curl -X PUT http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <different-user-token>" \
  -d '{
    "name": "Hacked Deck",
    "description": "Unauthorized update"
  }'
```

**Response:**
```json
{
  "status": 403,
  "message": "You do not have permission to update this deck",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:12:00.000Z"
}
```

**Error - Deck not found (HTTP 404 Not Found):**
```bash
curl -X PUT http://localhost:9009/api/v1/osmosis/decks/99999999-0000-0000-0000-000000000000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Non-existent Deck",
    "description": "This deck does not exist"
  }'
```

**Response:**
```json
{
  "status": 404,
  "message": "Deck not found",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:13:00.000Z"
}
```

---

## 5. Soft Delete Deck (PATCH)

Marks a deck as deleted without removing it from the database. User must own the deck.

**Request:**
```bash
curl -X PATCH http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 200 OK):**
```json
{
  "status": 200,
  "message": "Deck deleted successfully",
  "data": null,
  "success": true,
  "timestamp": "2025-12-14T23:14:00.000Z"
}
```

**After soft delete, the deck will not appear in GET /decks or GET /decks/{id}:**
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (HTTP 404 Not Found):**
```json
{
  "status": 404,
  "message": "Deck not found",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:15:00.000Z"
}
```

**Error - User does not own deck (HTTP 403 Forbidden):**
```bash
curl -X PATCH http://localhost:9009/api/v1/osmosis/decks/a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d \
  -H "Authorization: Bearer <different-user-token>"
```

**Response:**
```json
{
  "status": 403,
  "message": "You do not have permission to delete this deck",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:16:00.000Z"
}
```

**Error - Deck not found (HTTP 404 Not Found):**
```bash
curl -X PATCH http://localhost:9009/api/v1/osmosis/decks/99999999-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "status": 404,
  "message": "Deck not found",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:17:00.000Z"
}
```

---

## Error Cases

### Authentication Error (HTTP 401 Unauthorized)
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks
# No Authorization header
```

**Response:**
```json
{
  "status": 401,
  "message": "You must be logged in to access this resource.",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:18:00.000Z"
}
```

### Invalid Token (HTTP 401 Unauthorized)
```bash
curl -X GET http://localhost:9009/api/v1/osmosis/decks \
  -H "Authorization: Bearer invalid-token-here"
```

**Response:**
```json
{
  "status": 401,
  "message": "You must be logged in to access this resource.",
  "data": null,
  "success": false,
  "timestamp": "2025-12-14T23:19:00.000Z"
}
```

---

## Summary

All endpoints follow RESTful conventions:

- **POST /decks** - Create (201 Created)
- **GET /decks** - List all active decks (200 OK)
- **GET /decks/{id}** - Get single deck (200 OK / 404 Not Found)
- **PUT /decks/{id}** - Update deck (200 OK / 403 Forbidden / 404 Not Found)
- **PATCH /decks/{id}** - Soft delete (200 OK / 403 Forbidden / 404 Not Found)

Key features:
- JWT authentication required for all endpoints
- User authorization - users can only modify/delete their own decks
- Soft delete - deleted decks are hidden but remain in database
- Pagination support with configurable page size and sorting
- Proper error handling with appropriate HTTP status codes
