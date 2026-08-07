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

import { useState, useCallback } from 'react';
import {Logger} from '@/utils';

export function useAsyncState(page: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Call this right before your API request starts
  const handleStart = useCallback(() => {
    setIsLoading(true);
    setError('');
    setIsSuccess(false);
  }, []);

  // Call this when your request finishes successfully
  const handleSuccess = useCallback(() => {
    setIsLoading(false);
    setIsSuccess(true);
  }, []);

  // Call this in your catch block
  const handleError = useCallback((originalErr: string, message: string) => {
    setIsLoading(false);
    setError(message);
    Logger.error(`[${page}] ${originalErr}`);
  }, [page]);

  // Optional: Reset everything to initial state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError('');
    setIsSuccess(false);
  }, []);

  return {
    isLoading,
    error,
    isSuccess,
    handleStart,
    handleSuccess,
    handleError,
    reset,
  };
}