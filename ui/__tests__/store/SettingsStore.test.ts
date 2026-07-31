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

import { useSettingsStore } from '../../store/SettingsStore';
import { DEFAULT_STUDY_SCHEDULE } from '../../types/Profile';

describe('SettingsStore', () => {
  const initial = useSettingsStore.getState();

  beforeEach(() => {
    useSettingsStore.setState(initial, true);
  });

  it('sets theme', () => {
    useSettingsStore.getState().setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('syncs theme from server settings', () => {
    useSettingsStore.getState().syncFromServer({
      theme: 'LIGHT',
      language: 'en',
      spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
      studySchedule: DEFAULT_STUDY_SCHEDULE,
    });
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('ignores invalid theme values from server', () => {
    useSettingsStore.getState().setTheme('dark');
    useSettingsStore.getState().syncFromServer({
      theme: 'neon',
      language: 'en',
      spaceConfig: { AGAIN: 1, HARD: 1, GOOD: 5, EASY: 10 },
      studySchedule: DEFAULT_STUDY_SCHEDULE,
    });
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
