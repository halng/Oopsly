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

import com.app.oopsly.api.entity.Language;
import org.junit.jupiter.api.Test;

class LanguageTest {

    @Test
    void fromString_returnsCorrectLanguage_forValidInput() {
        assertEquals(Language.ENGLISH, Language.fromString("en"));
        assertEquals(Language.VIETNAMESE, Language.fromString("vi"));
    }

    @Test
    void fromString_isCaseInsensitive() {
        assertEquals(Language.ENGLISH, Language.fromString("en"));
        assertEquals(Language.VIETNAMESE, Language.fromString("vi"));
        assertEquals(Language.ENGLISH, Language.fromString("EN"));
        assertEquals(Language.VIETNAMESE, Language.fromString("VI"));
    }

    @Test
    void fromString_throwsException_forInvalidLanguage() {
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> Language.fromString("invalid"));
        assertTrue(exception.getMessage().contains("Invalid language code"));
    }

    @Test
    void fromString_throwsException_forNullInput() {
        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> Language.fromString(null));
        assertTrue(exception.getMessage().contains("Language code cannot be null"));
    }

    @Test
    void getCode_returnsCorrectCode() {
        assertEquals("en", Language.ENGLISH.getCode());
        assertEquals("vi", Language.VIETNAMESE.getCode());
    }
}
