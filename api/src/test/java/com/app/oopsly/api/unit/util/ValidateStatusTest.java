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

import com.app.oopsly.api.util.ValidateStatus;
import org.junit.jupiter.api.Test;

class ValidateStatusTest {

    @Test
    void enumContainsAllExpectedValues() {
        ValidateStatus[] values = ValidateStatus.values();
        assertEquals(4, values.length);
    }

    @Test
    void enumContainsValid() {
        ValidateStatus status = ValidateStatus.VALID;
        assertNotNull(status);
        assertEquals("VALID", status.name());
    }

    @Test
    void enumContainsInvalidated() {
        ValidateStatus status = ValidateStatus.INVALIDATED;
        assertNotNull(status);
        assertEquals("INVALIDATED", status.name());
    }

    @Test
    void enumContainsInvalid() {
        ValidateStatus status = ValidateStatus.INVALID;
        assertNotNull(status);
        assertEquals("INVALID", status.name());
    }

    @Test
    void enumContainsExpired() {
        ValidateStatus status = ValidateStatus.EXPIRED;
        assertNotNull(status);
        assertEquals("EXPIRED", status.name());
    }

    @Test
    void valueOf_returnsCorrectEnumConstant() {
        assertEquals(ValidateStatus.VALID, ValidateStatus.valueOf("VALID"));
        assertEquals(ValidateStatus.INVALIDATED, ValidateStatus.valueOf("INVALIDATED"));
        assertEquals(ValidateStatus.INVALID, ValidateStatus.valueOf("INVALID"));
        assertEquals(ValidateStatus.EXPIRED, ValidateStatus.valueOf("EXPIRED"));
    }

    @Test
    void valueOf_throwsException_forInvalidValue() {
        assertThrows(IllegalArgumentException.class, () -> ValidateStatus.valueOf("NONEXISTENT"));
    }

    @Test
    void enumValuesAreUnique() {
        ValidateStatus[] values = ValidateStatus.values();
        for (int i = 0; i < values.length; i++) {
            for (int j = i + 1; j < values.length; j++) {
                assertNotEquals(values[i], values[j]);
            }
        }
    }

    @Test
    void switchStatement_handlesAllCases() {
        for (ValidateStatus status : ValidateStatus.values()) {
            String result =
                    switch (status) {
                        case VALID -> "valid";
                        case INVALID -> "invalid";
                        case EXPIRED -> "expired";
                        case INVALIDATED -> "invalidated";
                    };
            assertNotNull(result);
        }
    }
}
