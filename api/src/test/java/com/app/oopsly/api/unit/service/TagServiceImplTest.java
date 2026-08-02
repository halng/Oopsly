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

package com.app.oopsly.api.unit.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.TagEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TagRepository;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.service.impl.TagServiceImpl;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardRes;
import com.app.oopsly.api.viewmodel.TagRes;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class TagServiceImplTest {

    @Mock private TagRepository tagRepository;
    @Mock private CardRepository cardRepository;
    @Mock private ShelfRepository shelfRepository;
    @Mock private SubjectRepository subjectRepository;
    @Mock private UserService userService;

    @InjectMocks private TagServiceImpl tagService;

    private User user;
    private UUID shelfId;
    private UUID subjectId;
    private UUID cardId;
    private UUID tagId;
    private ShelfEntity shelf;
    private SubjectEntity subject;
    private CardEntity card;
    private TagEntity tag;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
        cardId = UUID.randomUUID();
        tagId = UUID.randomUUID();

        shelf = new ShelfEntity();
        shelf.setId(shelfId);
        shelf.setUser(user);

        subject = new SubjectEntity();
        subject.setId(subjectId);
        subject.setShelf(shelf);

        card = new CardEntity();
        card.setId(cardId);
        card.setFront("Q");
        card.setBack("A");
        card.setSubject(subject);
        card.setTags(new ArrayList<>());

        tag = TagEntity.builder().name("vocab").user(user).build();
        tag.setId(tagId);
        tag.setDeleted(false);
    }

    @Test
    void createTag_success() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(tagRepository.existsByNameAndUser("vocab", user)).thenReturn(false);
        when(tagRepository.save(any(TagEntity.class)))
                .thenAnswer(
                        inv -> {
                            TagEntity t = inv.getArgument(0);
                            t.setId(tagId);
                            return t;
                        });

        ApiRes result = tagService.createTag("vocab");
        assertEquals(201, result.getStatusCode().value());
        TagRes res = (TagRes) result.getBody().data();
        assertEquals("vocab", res.name());
    }

    @Test
    void createTag_duplicate_throws() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(tagRepository.existsByNameAndUser("vocab", user)).thenReturn(true);
        assertThrows(ValidationException.class, () -> tagService.createTag("vocab"));
    }

    @Test
    void getAllTags_filtersDeleted() {
        TagEntity deleted = TagEntity.builder().name("old").user(user).build();
        deleted.setId(UUID.randomUUID());
        deleted.setDeleted(true);
        when(userService.getCurrentUser()).thenReturn(user);
        when(tagRepository.findAllByUser(user)).thenReturn(List.of(tag, deleted));

        ApiRes result = tagService.getAllTags();
        @SuppressWarnings("unchecked")
        List<TagRes> tags = (List<TagRes>) result.getBody().data();
        assertEquals(1, tags.size());
        assertEquals("vocab", tags.get(0).name());
    }

    @Test
    void deleteTag_softDeletes() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.of(tag));
        when(tagRepository.save(tag)).thenReturn(tag);

        ApiRes result = tagService.deleteTag(tagId);
        assertTrue(result.getBody().isSuccess());
        assertTrue(Boolean.TRUE.equals(tag.getDeleted()));
    }

    @Test
    void deleteTag_notFound() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.empty());
        assertThrows(NotFoundException.class, () -> tagService.deleteTag(tagId));
    }

    @Test
    void addTagToCard_linksWhenMissing() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.of(tag));

        ApiRes result = tagService.addTagToCard(shelfId, subjectId, cardId, tagId);
        assertTrue(result.getBody().isSuccess());
        ArgumentCaptor<CardEntity> captor = ArgumentCaptor.forClass(CardEntity.class);
        verify(cardRepository).save(captor.capture());
        assertEquals(1, captor.getValue().getTags().size());
    }

    @Test
    void addTagToCard_skipsWhenAlreadyLinked() {
        card.setTags(new ArrayList<>(List.of(tag)));
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.of(tag));

        tagService.addTagToCard(shelfId, subjectId, cardId, tagId);
        verify(cardRepository, never()).save(any());
    }

    @Test
    void addTagToCard_nullTagsList_initializes() {
        card.setTags(null);
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.of(tag));

        tagService.addTagToCard(shelfId, subjectId, cardId, tagId);
        verify(cardRepository).save(any(CardEntity.class));
    }

    @Test
    void removeTagFromCard_removesLink() {
        card.setTags(new ArrayList<>(List.of(tag)));
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));

        tagService.removeTagFromCard(shelfId, subjectId, cardId, tagId);
        ArgumentCaptor<CardEntity> captor = ArgumentCaptor.forClass(CardEntity.class);
        verify(cardRepository).save(captor.capture());
        assertTrue(captor.getValue().getTags().isEmpty());
    }

    @Test
    void removeTagFromCard_nullTags_noSave() {
        card.setTags(null);
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));

        tagService.removeTagFromCard(shelfId, subjectId, cardId, tagId);
        verify(cardRepository, never()).save(any());
    }

    @Test
    void getCardsByTag_filtersMatchingCards() {
        CardEntity other = new CardEntity();
        other.setId(UUID.randomUUID());
        other.setFront("X");
        other.setBack("Y");
        other.setTags(List.of());
        card.setTags(List.of(tag));

        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
        when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                .thenReturn(Optional.of(subject));
        when(tagRepository.findByIdAndUser(tagId, user)).thenReturn(Optional.of(tag));
        when(cardRepository.findAllBySubject(eq(subject), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(card, other)));

        ApiRes result = tagService.getCardsByTag(shelfId, subjectId, tagId);
        @SuppressWarnings("unchecked")
        List<CardRes> cards = (List<CardRes>) result.getBody().data();
        assertEquals(1, cards.size());
        assertEquals(cardId, cards.get(0).id());
    }

    @Test
    void findCard_shelfNotFound() {
        when(userService.getCurrentUser()).thenReturn(user);
        when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.empty());
        assertThrows(
                NotFoundException.class,
                () -> tagService.addTagToCard(shelfId, subjectId, cardId, tagId));
    }
}
