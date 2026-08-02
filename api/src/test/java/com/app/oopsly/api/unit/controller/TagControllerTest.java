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

package com.app.oopsly.api.unit.controller;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.controller.TagController;
import com.app.oopsly.api.service.TagService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.TagReq;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TagControllerTest {

    @Mock private TagService tagService;
    @InjectMocks private TagController tagController;

    private ApiRes expected;
    private UUID shelfId;
    private UUID subjectId;
    private UUID cardId;
    private UUID tagId;

    @BeforeEach
    void setUp() {
        expected = ApiRes.success("ok");
        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        tagId = UUID.randomUUID();
    }

    @Test
    void createTag_delegates() {
        when(tagService.createTag("vocab")).thenReturn(expected);
        assertSame(expected, tagController.createTag(new TagReq("vocab")));
        verify(tagService).createTag("vocab");
    }

    @Test
    void getAllTags_delegates() {
        when(tagService.getAllTags()).thenReturn(expected);
        assertSame(expected, tagController.getAllTags());
    }

    @Test
    void deleteTag_delegates() {
        when(tagService.deleteTag(tagId)).thenReturn(expected);
        assertSame(expected, tagController.deleteTag(tagId));
    }

    @Test
    void addTagToCard_delegates() {
        when(tagService.addTagToCard(shelfId, subjectId, cardId, tagId)).thenReturn(expected);
        assertSame(expected, tagController.addTagToCard(shelfId, subjectId, cardId, tagId));
    }

    @Test
    void removeTagFromCard_delegates() {
        when(tagService.removeTagFromCard(shelfId, subjectId, cardId, tagId)).thenReturn(expected);
        assertSame(expected, tagController.removeTagFromCard(shelfId, subjectId, cardId, tagId));
    }

    @Test
    void getCardsByTag_delegates() {
        when(tagService.getCardsByTag(shelfId, subjectId, tagId)).thenReturn(expected);
        assertSame(expected, tagController.getCardsByTag(shelfId, subjectId, tagId));
    }
}
