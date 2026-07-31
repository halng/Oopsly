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

/** studyDays: 0=Sunday … 6=Saturday (JS Date.getDay() convention). */
export interface StudySchedule {
  preferredStudyTime: string;
  studyDays: number[];
  reminderEnabled: boolean;
}

export interface SettingsRes {
  theme: string;
  language: string;
  spaceConfig: {
    AGAIN: number;
    HARD: number;
    GOOD: number;
    EASY: number;
  };
  studySchedule: StudySchedule;
}

export interface UserProfileRes {
  displayName: string;
  bio: string | null;
  age: number | null;
  settings: SettingsRes;
}

export interface UpdateProfileReq {
  displayName: string;
  bio?: string;
  age?: number;
}

export interface UpdateSettingsReq {
  theme: string;
  language: string;
  spaceConfig: {
    AGAIN: number;
    HARD: number;
    GOOD: number;
    EASY: number;
  };
  studySchedule: StudySchedule;
}

export const DEFAULT_STUDY_SCHEDULE: StudySchedule = {
  preferredStudyTime: "09:00",
  studyDays: [1, 2, 3, 4, 5],
  reminderEnabled: false,
};
