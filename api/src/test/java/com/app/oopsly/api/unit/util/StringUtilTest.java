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

package com.app.oopsly.api.unit.util;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.util.StringUtils;
import org.junit.jupiter.api.Test;

class StringUtilTest {

    @Test
    void masked_returnsNullWhenInputIsNull() {
        assertNotNull(new StringUtils());
        assertNull(StringUtils.masked(null));
    }

    @Test
    void masked_returnsSameForEmptyOrShortStrings() {
        assertEquals("", StringUtils.masked(""));
        assertEquals("a", StringUtils.masked("a"));
        assertEquals("ab", StringUtils.masked("ab"));
    }

    @Test
    void masked_masksMiddleForLengthThree() {
        assertEquals("a*c", StringUtils.masked("abc"));
    }

    @Test
    void masked_preservesFirstAndLastAndAddsCorrectNumberOfAsterisks() {
        String original = "user@example.com";
        String masked = StringUtils.masked(original);

        assertNotNull(masked);
        assertEquals(
                original.length(), masked.length(), "masked length should match original length");
        assertEquals(original.charAt(0), masked.charAt(0), "first char must be preserved");
        assertEquals(
                original.charAt(original.length() - 1),
                masked.charAt(masked.length() - 1),
                "last char must be preserved");

        long asteriskCount = masked.chars().filter(c -> c == '*').count();
        assertEquals(
                original.length() - 2, asteriskCount, "number of asterisks should be length - 2");
    }

    @Test
    void masked_handlesUnicodeSurrogatePairsByCharUnits() {
        // build a string: 😊 b 😊  (each emoji is a surrogate pair -> 2 chars)
        String emoji = "\uD83D\uDE0A"; // 😊
        String original = emoji + "b" + emoji;
        String masked = StringUtils.masked(original);

        assertNotNull(masked);
        assertEquals(
                original.length(), masked.length(), "masked length matches original (char units)");
        assertEquals(original.charAt(0), masked.charAt(0), "first char unit preserved");
        assertEquals(
                original.charAt(original.length() - 1),
                masked.charAt(masked.length() - 1),
                "last char unit preserved");

        long asteriskCount = masked.chars().filter(c -> c == '*').count();
        assertEquals(
                original.length() - 2,
                asteriskCount,
                "asterisk count equals length - 2 (char units)");
    }
}
