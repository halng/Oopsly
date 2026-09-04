/*
 *    Copyright 2026 Hao Nguyen Tan
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

export const IDS = {
  shelf: "shelf-cypress-1",
  subject: "subject-cypress-1",
  card1: "card-cypress-1",
  card2: "card-cypress-2",
  card3: "card-cypress-3",
  card4: "card-cypress-4",
  deck1: "deck-cypress-1",
  deck2: "deck-cypress-2",
  testSuite: "suite-cypress-1",
} as const;

export const USER = {
  email: "cypress@example.com",
  displayName: "Cypress Learner",
  bio: "Learning with Cypress mocks",
  age: 28,
} as const;

export function apiOk<T>(data: T, message = "OK") {
  return {
    status: 200,
    isSuccess: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function apiFail(message: string, status = 400) {
  return {
    status,
    isSuccess: false,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };
}

export const mockStats = {
  dailyStreak: 7,
  totalXp: 1250,
  cardsReviewedToday: 12,
  totalCards: 48,
  dueCards: 5,
  retentionRate: 86.5,
};

export const mockStudySchedule = {
  preferredStudyTime: "09:00",
  studyDays: [1, 2, 3, 4, 5],
  reminderEnabled: false,
};

export const mockProfile = {
  displayName: USER.displayName,
  bio: USER.bio,
  age: USER.age,
  settings: {
    theme: "LIGHT",
    language: "ENGLISH",
    spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
    studySchedule: mockStudySchedule,
  },
};

export const mockSubject = {
  id: IDS.subject,
  name: "TOEIC Vocabulary",
  description: "High-frequency business English",
  overdue: 5,
  completedPercent: 62,
  dailyLimit: 50,
  newCardsPerDay: 10,
  interval: 1,
};

export const mockShelf = {
  id: IDS.shelf,
  icon: "📚",
  name: "Language Shelf",
  description: "Languages and exams",
  subjects: [mockSubject],
};

export const mockShelvesPage = {
  entities: [mockShelf],
  totalElements: 1,
  totalPages: 1,
  currentPage: 0,
  totalItems: 1,
  hasNextPage: false,
};

export const mockCards = {
  entities: [
    {
      id: IDS.card1,
      front: "Acquire",
      back: "To get or obtain something",
      difficultyLevel: "GOOD",
      nextPracticeTime: new Date(Date.now() - 60_000).toISOString(),
      numberOfPractice: 3,
    },
    {
      id: IDS.card2,
      front: "Negotiate",
      back: "To discuss to reach an agreement",
      difficultyLevel: "HARD",
      nextPracticeTime: new Date(Date.now() - 60_000).toISOString(),
      numberOfPractice: 1,
    },
    {
      id: IDS.card3,
      front: "Revenue",
      back: "Income from business activities",
      difficultyLevel: "EASY",
      nextPracticeTime: new Date(Date.now() + 86_400_000).toISOString(),
      numberOfPractice: 5,
    },
    {
      id: IDS.card4,
      front: "Deadline",
      back: "The latest time something must be done",
      difficultyLevel: "AGAIN",
      nextPracticeTime: new Date(Date.now() - 60_000).toISOString(),
      numberOfPractice: 0,
    },
  ],
  totalPages: 1,
  currentPage: 0,
  totalItems: 4,
  hasNextPage: false,
};

export const mockDiscoverPage = {
  entities: [
    {
      id: IDS.deck1,
      name: "Spanish A1 Starter",
      description: "Beginner Spanish essentials",
      cardCount: 40,
    },
    {
      id: IDS.deck2,
      name: "Java Streams Cheatsheet",
      description: "Common stream operations",
      cardCount: 25,
    },
  ],
  totalItems: 2,
  hasNextPage: false,
};

export const mockTestSuites = {
  entities: [
    {
      id: IDS.testSuite,
      name: "Quick Drill",
      description: "10 mixed cards",
      cardCount: 10,
    },
  ],
  totalItems: 1,
  hasNextPage: false,
};
