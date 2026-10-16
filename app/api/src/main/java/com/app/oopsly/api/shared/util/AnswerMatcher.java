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

package com.app.oopsly.api.shared.util;

import java.util.List;
import java.util.Locale;

/** Lenient comparison of free-text answers (fill in the blank). */
public final class AnswerMatcher {

    public static final int MAX_ANSWER_LENGTH = 100;

    /** Answers at least this long tolerate a single-character typo. */
    public static final int TYPO_TOLERANCE_MIN_LENGTH = 6;

    private AnswerMatcher() {}

    public static String normalize(String value, boolean caseSensitive) {
        if (value == null) {
            return "";
        }
        String collapsed = value.trim().replaceAll("\\s+", " ");
        return caseSensitive ? collapsed : collapsed.toLowerCase(Locale.ROOT);
    }

    public static boolean matches(String input, List<String> accepted, boolean caseSensitive) {
        if (input == null
                || input.length() > MAX_ANSWER_LENGTH
                || accepted == null
                || accepted.isEmpty()) {
            return false;
        }
        String given = normalize(input, caseSensitive);
        if (given.isEmpty()) {
            return false;
        }
        for (String candidate : accepted) {
            if (candidate == null || candidate.length() > MAX_ANSWER_LENGTH) {
                continue;
            }
            String expected = normalize(candidate, caseSensitive);
            if (expected.isEmpty()) {
                continue;
            }
            if (given.equals(expected)) {
                return true;
            }
            if (expected.length() >= TYPO_TOLERANCE_MIN_LENGTH
                    && Math.abs(expected.length() - given.length()) <= 1
                    && withinOneEdit(given, expected)) {
                return true;
            }
        }
        return false;
    }

    private static boolean withinOneEdit(String a, String b) {
        int i = 0;
        int j = 0;
        int edits = 0;
        while (i < a.length() && j < b.length()) {
            if (a.charAt(i) == b.charAt(j)) {
                i++;
                j++;
            } else if (++edits > 1) {
                return false;
            } else if (a.length() > b.length()) {
                i++;
            } else if (a.length() < b.length()) {
                j++;
            } else {
                i++;
                j++;
            }
        }
        return edits + (i < a.length() || j < b.length() ? 1 : 0) <= 1;
    }

    public static int levenshtein(String a, String b) {
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) {
            previous[j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                current[j] =
                        Math.min(
                                Math.min(current[j - 1] + 1, previous[j] + 1),
                                previous[j - 1] + cost);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[b.length()];
    }
}
