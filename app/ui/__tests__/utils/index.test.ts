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

import { Logger } from '../../utils';

describe('Utils Index Exports', () => {
  it('should export Logger', () => {
    expect(Logger).toBeDefined();
    expect(typeof Logger).toBe('object');
  });

  it('should have Logger methods', () => {
    expect(typeof Logger.debug).toBe('function');
    expect(typeof Logger.info).toBe('function');
    expect(typeof Logger.warn).toBe('function');
    expect(typeof Logger.error).toBe('function');
    expect(typeof Logger.extend).toBe('function');
  });

  it('should be able to extend Logger', () => {
    const extendedLogger = Logger.extend('Test');
    expect(extendedLogger).toBeDefined();
    expect(typeof extendedLogger.debug).toBe('function');
  });
});
