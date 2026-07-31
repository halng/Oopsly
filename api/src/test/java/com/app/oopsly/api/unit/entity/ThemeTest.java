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

package com.app.oopsly.api.unit.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.entity.Theme;
import org.junit.jupiter.api.Test;

class ThemeTest {

    @Test
    void fromString_returnsCorrectTheme_forValidInput() {
        assertEquals(Theme.LIGHT, Theme.fromString("LIGHT"));
        assertEquals(Theme.DARK, Theme.fromString("DARK"));
        assertEquals(Theme.SYSTEM, Theme.fromString("SYSTEM"));
    }

    @Test
    void fromString_isCaseInsensitive() {
        assertEquals(Theme.LIGHT, Theme.fromString("light"));
        assertEquals(Theme.DARK, Theme.fromString("dark"));
        assertEquals(Theme.SYSTEM, Theme.fromString("system"));
        assertEquals(Theme.LIGHT, Theme.fromString("Light"));
        assertEquals(Theme.DARK, Theme.fromString("DaRk"));
    }

    @Test
    void fromString_throwsException_forInvalidTheme() {
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> Theme.fromString("INVALID"));
        assertTrue(exception.getMessage().contains("Invalid theme"));
    }

    @Test
    void fromString_throwsException_forNullInput() {
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> Theme.fromString(null));
        assertTrue(exception.getMessage().contains("Theme cannot be null"));
    }

    @Test
    void fromString_throwsException_forEmptyString() {
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> Theme.fromString(""));
        assertTrue(exception.getMessage().contains("Invalid theme"));
    }
}
