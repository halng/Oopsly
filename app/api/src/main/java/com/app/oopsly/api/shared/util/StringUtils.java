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

import java.text.Normalizer;
import java.util.Locale;

public class StringUtils {
    /**
     * Build a URL slug: strip accents, lowercase, and join alphanumeric runs with dashes.
     *
     * @param value the source text
     * @param fallback returned when the value has no alphanumeric characters
     * @return the slug
     */
    public static String slugify(String value, String fallback) {
        if (value == null) {
            return fallback;
        }
        String ascii =
                Normalizer.normalize(value.replace('đ', 'd').replace('Đ', 'D'), Normalizer.Form.NFD)
                        .replaceAll("\\p{M}+", "");
        String slug =
                ascii.toLowerCase(Locale.ROOT)
                        .replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("(^-+)|(-+$)", "");
        return slug.isEmpty() ? fallback : slug;
    }

    /**
     * Mask a string by replacing all characters except the first and last with asterisks. If the
     * string length is less than or equal to 2, return the original string
     *
     * @param org the original string
     * @return the masked string
     */
    public static String masked(String org) {
        if (org == null || org.length() <= 2) {
            return org;
        }
        StringBuilder masked = new StringBuilder();
        masked.append(org.charAt(0));
        masked.append("*".repeat(org.length() - 2));
        masked.append(org.charAt(org.length() - 1));
        return masked.toString();
    }
}
