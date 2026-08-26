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

package com.app.oopsly.api.unit.card.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.application.TagServiceImpl;
import com.app.oopsly.api.card.application.vm.CardRes;
import com.app.oopsly.api.card.domain.CardEntity;
import com.app.oopsly.api.card.domain.TagEntity;
import com.app.oopsly.api.card.infrastructure.CardRepository;
import com.app.oopsly.api.card.infrastructure.TagRepository;
import com.app.oopsly.api.library.domain.ShelfEntity;
import com.app.oopsly.api.library.domain.SubjectEntity;
import com.app.oopsly.api.library.infrastructure.ShelfRepository;
import com.app.oopsly.api.library.infrastructure.SubjectRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.user.application.UserService;
import com.app.oopsly.api.user.domain.User;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

/** Covers the card <-> tag association flows. */
@ExtendWith(MockitoExtension.class)
class TagServiceCardLinkTest {

    @Mock private TagRepository tagRepository;
    @Mock private CardRepository cardRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private UserService userService;

    @InjectMocks private TagServiceImpl tagService;

    private User currentUser;
    private ShelfEntity shelf;
    private SubjectEntity subject;
    private CardEntity card;
    private TagEntity tag;

    private UUID shelfId;
    private UUID subjectId;
    private UUID cardId;
    private UUID tagId;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(UUID.randomUUID());

        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        tagId = UUID.randomUUID();

        shelf = new ShelfEntity();
        shelf.setId(shelfId);
        shelf.setUser(currentUser);

        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setShelf(shelf);

        card = new CardEntity();
        card.setId(cardId);
        card.setSubject(subject);
        card.setFront("front");
        card.setBack("back");

        tag = TagEntity.builder().name("kanji").user(currentUser).build();
        tag.setId(tagId);
    }

    private void resolveOwnership() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
    }

    private void resolveCard() {
        resolveOwnership();
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
    }

    // ------------------------------------------------------------- add / link

    @Test
    void addTagToCard_linksTheTagWhenNotPresentYet() {
        card.setTags(null);
        resolveCard();
        when(tagRepository.findByIdAndUser(tagId, currentUser)).thenReturn(Optional.of(tag));

        ApiRes response = tagService.addTagToCard(shelfId, subjectId, cardId, tagId);

        assertTrue(response.getBody().isSuccess());
        assertEquals(1, card.getTags().size());
        verify(cardRepository).save(card);
    }

    @Test
    void addTagToCard_isIdempotentForAnAlreadyLinkedTag() {
        card.setTags(new ArrayList<>(List.of(tag)));
        resolveCard();
        when(tagRepository.findByIdAndUser(tagId, currentUser)).thenReturn(Optional.of(tag));

        tagService.addTagToCard(shelfId, subjectId, cardId, tagId);

        assertEquals(1, card.getTags().size());
        verify(cardRepository, never()).save(any());
    }

    @Test
    void addTagToCard_unknownTagThrowsNotFound() {
        resolveCard();
        when(tagRepository.findByIdAndUser(tagId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> tagService.addTagToCard(shelfId, subjectId, cardId, tagId));
    }

    @Test
    void addTagToCard_cardOfAnotherShelfThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> tagService.addTagToCard(shelfId, subjectId, cardId, tagId));
    }

    @Test
    void addTagToCard_unknownSubjectThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> tagService.addTagToCard(shelfId, subjectId, cardId, tagId));
    }

    @Test
    void addTagToCard_unknownCardThrowsNotFound() {
        resolveOwnership();
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class,
                () -> tagService.addTagToCard(shelfId, subjectId, cardId, tagId));
    }

    // ----------------------------------------------------------------- remove

    @Test
    void removeTagFromCard_dropsTheLink() {
        card.setTags(new ArrayList<>(List.of(tag)));
        resolveCard();

        ApiRes response = tagService.removeTagFromCard(shelfId, subjectId, cardId, tagId);

        assertTrue(response.getBody().isSuccess());
        assertTrue(card.getTags().isEmpty());
        verify(cardRepository).save(card);
    }

    @Test
    void removeTagFromCard_withoutTagsIsANoOp() {
        card.setTags(null);
        resolveCard();

        assertTrue(
                tagService
                        .removeTagFromCard(shelfId, subjectId, cardId, tagId)
                        .getBody()
                        .isSuccess());
        verify(cardRepository, never()).save(any());
    }

    // ------------------------------------------------------------ getByTag

    @Test
    void getCardsByTag_returnsOnlyTaggedCards() {
        CardEntity tagged = card;
        tagged.setTags(new ArrayList<>(List.of(tag)));

        CardEntity untagged = new CardEntity();
        untagged.setId(UUID.randomUUID());
        untagged.setSubject(subject);
        untagged.setTags(new ArrayList<>());

        CardEntity nullTags = new CardEntity();
        nullTags.setId(UUID.randomUUID());
        nullTags.setSubject(subject);
        nullTags.setTags(null);

        resolveOwnership();
        when(tagRepository.findByIdAndUser(tagId, currentUser)).thenReturn(Optional.of(tag));
        Page<CardEntity> page = new PageImpl<>(List.of(tagged, untagged, nullTags));
        when(cardRepository.findAllBySubject(eqSubject(), any(Pageable.class))).thenReturn(page);

        ApiRes response = tagService.getCardsByTag(shelfId, subjectId, tagId);

        @SuppressWarnings("unchecked")
        List<CardRes> result = (List<CardRes>) response.getBody().data();
        assertEquals(1, result.size());
        assertEquals(tagged.getId(), result.get(0).id());
    }

    @Test
    void getCardsByTag_unknownTagThrowsNotFound() {
        resolveOwnership();
        when(tagRepository.findByIdAndUser(tagId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> tagService.getCardsByTag(shelfId, subjectId, tagId));
    }

    @Test
    void getCardsByTag_unknownShelfThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> tagService.getCardsByTag(shelfId, subjectId, tagId));
    }

    @Test
    void getCardsByTag_unknownSubjectThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(shelfRepository.findByIdAndUser(shelfId, currentUser)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf)).thenReturn(Optional.empty());

        assertThrows(
                NotFoundException.class, () -> tagService.getCardsByTag(shelfId, subjectId, tagId));
    }

    private SubjectEntity eqSubject() {
        return org.mockito.ArgumentMatchers.eq(subject);
    }
}
