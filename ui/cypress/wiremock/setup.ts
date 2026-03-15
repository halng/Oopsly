/*
 *    Copyright 2025 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { WireMock, EndpointFeature, MatchingAttributes } from 'wiremock-captain';

const API_BASE = '/api/v1/oopsly';
const TIMESTAMP = '2025-01-01T00:00:00Z';

// ─── Shared test data ─────────────────────────────────────────────────────────

const TEST_USER = { email: 'test@example.com', displayName: 'Test User' };

const AUTH_TOKENS = {
  access_token: 'wiremock-test-access-token',
  refresh_token: 'wiremock-test-refresh-token',
  type: 'Bearer',
};

const TEST_SHELVES = [
  {
    id: 'shelf-med-0001',
    icon: '🏥',
    name: 'Medicine',
    description: 'Medical studies shelf',
    subjects: [
      {
        id: 'subj-anat-0001',
        name: 'Anatomy',
        description: 'Study of human anatomy',
        overdue: 0,
        completedPercent: 65,
        dailyLimit: 20,
        newCardsPerDay: 5,
        interval: 1,
      },
      {
        id: 'subj-phys-0002',
        name: 'Physiology',
        description: 'Study of body functions',
        overdue: 2,
        completedPercent: 30,
        dailyLimit: 20,
        newCardsPerDay: 5,
        interval: 1,
      },
    ],
  },
  {
    id: 'shelf-eng-0002',
    icon: '⚙️',
    name: 'Engineering',
    description: 'Engineering topics',
    subjects: [],
  },
  {
    id: 'shelf-lang-0003',
    icon: '📚',
    name: 'Languages',
    description: 'Language learning',
    subjects: [],
  },
];

const SHELF_PAGINATED = {
  entities: TEST_SHELVES,
  totalElements: 3,
  totalPages: 1,
  currentPage: 0,
  totalItems: 3,
  hasNextPage: false,
};

const TEST_SUBJECT = {
  id: 'subj-anat-0001',
  name: 'Anatomy',
  description: 'Study of human anatomy',
  overdue: 0,
  completedPercent: 65,
  dailyLimit: 20,
  newCardsPerDay: 5,
  interval: 1,
};

const TEST_CARDS = {
  entities: [
    { id: 'card-0001', front: 'What is the femur?', back: 'The longest bone in the body.', difficultyLevel: 'GOOD', nextPracticeTime: 0, numberOfPractice: 3 },
    { id: 'card-0002', front: 'What is the patella?', back: 'The kneecap.', difficultyLevel: 'EASY', nextPracticeTime: 0, numberOfPractice: 5 },
    { id: 'card-0003', front: 'What is the tibia?', back: 'The shin bone.', difficultyLevel: 'HARD', nextPracticeTime: 0, numberOfPractice: 1 },
  ],
  totalPages: 1,
  currentPage: 0,
  totalItems: 3,
  hasNextPage: false,
};

const TEST_SUITES = [
  { id: 'ts-anatomy-0001', title: 'Anatomy Midterm', isActive: true },
  { id: 'ts-final-0002', title: 'Final Exam', isActive: true },
];

const TEST_QUESTIONS = [
  {
    id: 'q-powerhouse-0001',
    testSuiteId: 'ts-anatomy-0001',
    content: 'Which is the powerhouse of the cell?',
    type: 'SINGLE_CHOICE',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Body'],
    correctOptionIndices: [1],
  },
  {
    id: 'q-primes-0002',
    testSuiteId: 'ts-anatomy-0001',
    content: 'Select prime numbers.',
    type: 'MULTIPLE_CHOICE',
    options: ['2', '3', '4', '6'],
    correctOptionIndices: [0, 1],
  },
];

const TEST_PROFILE = {
  displayName: 'Test User',
  bio: null,
  age: null,
  settings: {
    theme: 'light',
    language: 'en',
    spaceConfig: { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 },
  },
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function apiResponse(data: unknown, message = 'Success') {
  return { status: 200, isSuccess: true, data, message, timestamp: TIMESTAMP };
}

// ─── Auth stubs ───────────────────────────────────────────────────────────────

async function setupAuthStubs(wm: WireMock): Promise<void> {
  // POST /otp?email=... — send OTP (any email, low priority fallback)
  await wm.register(
    { endpoint: `${API_BASE}/otp`, method: 'POST' },
    { status: 200, body: apiResponse(null, 'OTP sent to your email') },
    { requestEndpointFeature: EndpointFeature.UrlPath, stubPriority: 5 },
  );

  // POST /otp/validate — correct OTP (otp = 123456) → success (high priority)
  await wm.register(
    { endpoint: `${API_BASE}/otp/validate`, method: 'POST', body: { otp: '123456' } },
    { status: 200, body: apiResponse(AUTH_TOKENS, 'Login successful') },
    {
      requestBodyFeature: MatchingAttributes.EqualToJson,
      requestIgnoreExtraElements: true,
      stubPriority: 1,
    },
  );

  // POST /otp/validate — any other OTP → invalid (low priority fallback)
  await wm.register(
    { endpoint: `${API_BASE}/otp/validate`, method: 'POST' },
    { status: 401, body: { status: 401, isSuccess: false, data: null, message: 'Invalid or expired OTP', timestamp: TIMESTAMP } },
    { stubPriority: 5 },
  );

  // GET /users/validate — validate access token
  await wm.register(
    { endpoint: `${API_BASE}/users/validate`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_USER, 'Token is valid') },
  );

  // POST /users/refresh-token — refresh token
  await wm.register(
    { endpoint: `${API_BASE}/users/refresh-token`, method: 'POST' },
    { status: 200, body: apiResponse({ ...AUTH_TOKENS, access_token: 'wiremock-refreshed-access-token' }, 'Token refreshed') },
  );
}

// ─── Shelf stubs ──────────────────────────────────────────────────────────────

async function setupShelfStubs(wm: WireMock): Promise<void> {
  // GET /shelves — paginated list (exact path, any query params)
  await wm.register(
    { endpoint: `${API_BASE}/shelves`, method: 'GET' },
    { status: 200, body: apiResponse(SHELF_PAGINATED) },
    { requestEndpointFeature: EndpointFeature.UrlPath, stubPriority: 1 },
  );

  // GET /shelves/:id — single shelf
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_SHELVES[0]) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );

  // POST /shelves — create shelf
  await wm.register(
    { endpoint: `${API_BASE}/shelves`, method: 'POST' },
    {
      status: 201,
      body: apiResponse(
        { id: 'shelf-new-0000', icon: '📖', name: 'New Shelf', description: null, subjects: [] },
        'Shelf created successfully',
      ),
    },
    { requestEndpointFeature: EndpointFeature.UrlPath },
  );

  // PUT /shelves/:id — update shelf
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+`, method: 'PUT' },
    {
      status: 200,
      body: apiResponse(
        { id: 'shelf-med-0001', icon: '🏥', name: 'Updated Shelf', description: null, subjects: [] },
        'Shelf updated successfully',
      ),
    },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // PATCH /shelves/:id — soft delete
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+`, method: 'PATCH' },
    { status: 200, body: apiResponse(null, 'Shelf deleted successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );
}

// ─── Subject stubs ────────────────────────────────────────────────────────────

async function setupSubjectStubs(wm: WireMock): Promise<void> {
  // GET /shelves/:shelfId/subjects/:id
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_SUBJECT) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );

  // POST /shelves/:shelfId/subjects
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects`, method: 'POST' },
    {
      status: 201,
      body: apiResponse(
        { id: 'subj-new-0000', name: 'New Subject', description: '', overdue: 0, completedPercent: 0, dailyLimit: 20, newCardsPerDay: 5, interval: 1 },
        'Subject created successfully',
      ),
    },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // PUT /shelves/:shelfId/subjects/:id/settings
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/settings`, method: 'PUT' },
    { status: 200, body: apiResponse(TEST_SUBJECT, 'Settings updated successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // PUT /shelves/:shelfId/subjects/:id
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+`, method: 'PUT' },
    { status: 200, body: apiResponse(TEST_SUBJECT, 'Subject updated successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // PATCH /shelves/:shelfId/subjects/:id — soft delete
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+`, method: 'PATCH' },
    { status: 200, body: apiResponse(null, 'Subject deleted successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );
}

// ─── Card stubs ───────────────────────────────────────────────────────────────

async function setupCardStubs(wm: WireMock): Promise<void> {
  // PUT /shelves/:shelfId/subjects/:subjectId/cards/difficulty
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/cards/difficulty`, method: 'PUT' },
    { status: 200, body: apiResponse(null, 'Difficulty levels updated') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 1 },
  );

  // GET /shelves/:shelfId/subjects/:subjectId/cards
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/cards`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_CARDS) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 2 },
  );

  // POST /shelves/:shelfId/subjects/:subjectId/cards
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/cards`, method: 'POST' },
    { status: 201, body: apiResponse(null, 'Cards created successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 2 },
  );

  // PUT /shelves/:shelfId/subjects/:subjectId/cards/:cardId
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/cards/[^/]+`, method: 'PUT' },
    { status: 200, body: apiResponse(TEST_CARDS.entities[0], 'Card updated successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );

  // PATCH /shelves/:shelfId/subjects/:subjectId/cards/:cardId — soft delete
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/subjects/[^/]+/cards/[^/]+`, method: 'PATCH' },
    { status: 200, body: apiResponse(null, 'Card deleted successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );
}

// ─── Test suite stubs ─────────────────────────────────────────────────────────

async function setupTestSuiteStubs(wm: WireMock): Promise<void> {
  // GET /shelves/:shelfId/test-suites
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/test-suites`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_SUITES) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // POST /shelves/:shelfId/test-suites
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/test-suites`, method: 'POST' },
    {
      status: 201,
      body: apiResponse({ id: 'ts-new-0000', title: 'New Test Suite', isActive: true }, 'Test suite created successfully'),
    },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // DELETE /shelves/:shelfId/test-suites/:id
  await wm.register(
    { endpoint: `${API_BASE}/shelves/[^/]+/test-suites/[^/]+`, method: 'DELETE' },
    { status: 200, body: apiResponse(null, 'Test suite deleted successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );

  // GET /test-suites/:id/cards
  await wm.register(
    { endpoint: `${API_BASE}/test-suites/[^/]+/cards`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_CARDS.entities) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern },
  );
}

// ─── Question stubs ───────────────────────────────────────────────────────────

async function setupQuestionStubs(wm: WireMock): Promise<void> {
  // GET /test-suites/:id/questions
  await wm.register(
    { endpoint: `${API_BASE}/test-suites/[^/]+/questions`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_QUESTIONS) },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 2 },
  );

  // POST /test-suites/:id/questions
  await wm.register(
    { endpoint: `${API_BASE}/test-suites/[^/]+/questions`, method: 'POST' },
    {
      status: 201,
      body: apiResponse(
        { id: 'q-new-0000', testSuiteId: 'ts-anatomy-0001', content: 'New Question?', type: 'FILL_IN_THE_BLANK', options: [], correctOptionIndices: [] },
        'Question created successfully',
      ),
    },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 2 },
  );

  // PUT /test-suites/:id/questions/:questionId
  await wm.register(
    { endpoint: `${API_BASE}/test-suites/[^/]+/questions/[^/]+`, method: 'PUT' },
    { status: 200, body: apiResponse(TEST_QUESTIONS[0], 'Question updated successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );

  // DELETE /test-suites/:id/questions/:questionId
  await wm.register(
    { endpoint: `${API_BASE}/test-suites/[^/]+/questions/[^/]+`, method: 'DELETE' },
    { status: 200, body: apiResponse(null, 'Question deleted successfully') },
    { requestEndpointFeature: EndpointFeature.UrlPathPattern, stubPriority: 5 },
  );
}

// ─── Profile stubs ────────────────────────────────────────────────────────────

async function setupProfileStubs(wm: WireMock): Promise<void> {
  // GET /user/profile
  await wm.register(
    { endpoint: `${API_BASE}/user/profile`, method: 'GET' },
    { status: 200, body: apiResponse(TEST_PROFILE) },
  );

  // PATCH /user/profile
  await wm.register(
    { endpoint: `${API_BASE}/user/profile`, method: 'PATCH' },
    { status: 200, body: apiResponse(TEST_PROFILE, 'Profile updated successfully') },
  );

  // PATCH /user/settings
  await wm.register(
    { endpoint: `${API_BASE}/user/settings`, method: 'PATCH' },
    { status: 200, body: apiResponse(TEST_PROFILE, 'Settings updated successfully') },
  );
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export async function setupAllDefaultStubs(wm: WireMock): Promise<void> {
  await setupAuthStubs(wm);
  await setupShelfStubs(wm);
  await setupSubjectStubs(wm);
  await setupCardStubs(wm);
  await setupTestSuiteStubs(wm);
  await setupQuestionStubs(wm);
  await setupProfileStubs(wm);
}
