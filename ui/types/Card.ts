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

export interface CardRes {
  id: string;
  front: string;
  back: string;
  difficultyLevel: string;
  /** ISO-8601 string or epoch from API */
  nextPracticeTime: string | number;
  numberOfPractice: number;
}

/** Card returned from test preset run (includes subject for SRS PATCH routes). */
export interface TestRunCardRes extends CardRes {
  subjectId: string;
}

export interface CardCreateRequest {
  front: string;
  back: string;
}

export interface CardUpdateRequest {
  front?: string;
  back?: string;
}

export interface CardPaginatedResponse {
  entities: CardRes[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
  hasNextPage?: boolean;
}


export interface ReviewedFlashcard {
  cardId: string;
  newLevel: 'HARD' | 'GOOD' | 'EASY' | 'AGAIN';
}