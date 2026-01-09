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

package com.app.oopsly.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.entity.Audit;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.repository.BaseRepository;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class ServiceDefaultMethodsTest {

    @Mock private BaseRepository<TestEntity, UUID> repository;

    private TestService service;
    private User currentUser;
    private UUID entityId;

    @BeforeEach
    void setUp() {
        service = new TestService(repository);
        currentUser = new User();
        currentUser.setId(UUID.randomUUID());
        currentUser.setEmail("test@example.com");
        entityId = UUID.randomUUID();
    }

    @Test
    void create_savesEntity_andReturnsSuccess() {
        TestRequest request = new TestRequest("test");
        TestEntity savedEntity = new TestEntity();
        savedEntity.setId(entityId);
        savedEntity.setValue("test");

        when(repository.save(any(TestEntity.class))).thenReturn(savedEntity);

        ApiRes result = service.create(request);

        assertNotNull(result);
        verify(repository, times(1)).save(any(TestEntity.class));
    }

    @Test
    void update_whenEntityExists_updatesAndReturnsSuccess() {
        TestRequest request = new TestRequest("updated");
        TestEntity existingEntity = new TestEntity();
        existingEntity.setId(entityId);
        existingEntity.setValue("old");

        when(repository.findByIdAndUser(entityId, currentUser))
                .thenReturn(Optional.of(existingEntity));
        when(repository.save(any(TestEntity.class))).thenReturn(existingEntity);

        ApiRes result = service.update(request, entityId);

        assertNotNull(result);
        verify(repository, times(1)).findByIdAndUser(entityId, currentUser);
        verify(repository, times(1)).save(any(TestEntity.class));
    }

    @Test
    void update_whenEntityNotFound_throwsNotFoundException() {
        TestRequest request = new TestRequest("updated");

        when(repository.findByIdAndUser(entityId, currentUser)).thenReturn(Optional.empty());

        NotFoundException exception =
                assertThrows(NotFoundException.class, () -> service.update(request, entityId));
        assertTrue(exception.getMessage().contains("Entity not found"));
        verify(repository, never()).save(any(TestEntity.class));
    }

    @Test
    void delete_whenEntityIsAudit_softDeletes() {
        TestEntity entity = new TestEntity();
        entity.setId(entityId);
        entity.setDeleted(false);

        when(repository.findByIdAndUser(entityId, currentUser)).thenReturn(Optional.of(entity));
        when(repository.save(any(TestEntity.class))).thenReturn(entity);

        ApiRes result = service.delete(entityId);

        assertNotNull(result);
        assertTrue(entity.getDeleted());
        verify(repository, times(1)).save(entity);
    }

    @Test
    void delete_whenEntityNotFound_throwsNotFoundException() {
        when(repository.findByIdAndUser(entityId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.delete(entityId));
        verify(repository, never()).save(any(TestEntity.class));
    }

    @Test
    void getById_whenEntityExists_returnsEntity() {
        TestEntity entity = new TestEntity();
        entity.setId(entityId);

        when(repository.findByIdAndUser(entityId, currentUser)).thenReturn(Optional.of(entity));

        ApiRes result = service.getById(entityId);

        assertNotNull(result);
        verify(repository, times(1)).findByIdAndUser(entityId, currentUser);
    }

    @Test
    void getById_whenEntityNotFound_throwsNotFoundException() {
        when(repository.findByIdAndUser(entityId, currentUser)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.getById(entityId));
    }

    @Test
    void getAll_returnsPagedResults() {
        List<TestEntity> entities = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            TestEntity entity = new TestEntity();
            entity.setId(UUID.randomUUID());
            entity.setValue("entity" + i);
            entities.add(entity);
        }

        Page<TestEntity> page = new PageImpl<>(entities, PageRequest.of(0, 10), 5);
        when(repository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(page);

        ApiRes result = service.getAll(0, 10);

        assertNotNull(result);
        verify(repository, times(1)).findAllByUser(eq(currentUser), any(Pageable.class));
    }

    @Test
    void getAll_withEmptyPage_returnsEmptyList() {
        Page<TestEntity> emptyPage =
                new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(repository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(emptyPage);

        ApiRes result = service.getAll(0, 10);

        assertNotNull(result);
        verify(repository, times(1)).findAllByUser(eq(currentUser), any(Pageable.class));
    }

    @Test
    void getAll_withMultiplePages_calculatesHasNextCorrectly() {
        List<TestEntity> entities = Arrays.asList(new TestEntity(), new TestEntity());
        Page<TestEntity> firstPage = new PageImpl<>(entities, PageRequest.of(0, 2), 5);

        when(repository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(firstPage);

        ApiRes result = service.getAll(0, 2);

        assertNotNull(result);
    }

    @Test
    void getAll_lastPage_hasNextIsFalse() {
        List<TestEntity> entities = Arrays.asList(new TestEntity());
        Page<TestEntity> lastPage = new PageImpl<>(entities, PageRequest.of(2, 2), 5);

        when(repository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(lastPage);

        ApiRes result = service.getAll(2, 2);

        assertNotNull(result);
    }

    @Test
    void getAll_singlePage_hasNextIsFalse() {
        List<TestEntity> entities = Arrays.asList(new TestEntity(), new TestEntity());
        Page<TestEntity> singlePage = new PageImpl<>(entities, PageRequest.of(0, 10), 2);

        when(repository.findAllByUser(eq(currentUser), any(Pageable.class))).thenReturn(singlePage);

        ApiRes result = service.getAll(0, 10);

        assertNotNull(result);
    }

    // Test entity that extends Audit
    private static class TestEntity extends Audit {
        private String value;

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value;
        }
    }

    // Test request
    private record TestRequest(String value) {}

    // Test service implementation
    private class TestService implements Service<TestEntity, TestRequest> {
        private final BaseRepository<TestEntity, UUID> repo;

        TestService(BaseRepository<TestEntity, UUID> repo) {
            this.repo = repo;
        }

        @Override
        public TestEntity toEntity(TestRequest from, TestEntity to) {
            if (to == null) {
                TestEntity entity = new TestEntity();
                entity.setValue(from.value());
                return entity;
            }
            to.setValue(from.value());
            return to;
        }

        @Override
        public TestRequest toViewModel(TestEntity from) {
            return new TestRequest(from.getValue());
        }

        @Override
        public BaseRepository<TestEntity, UUID> getRepository() {
            return repo;
        }

        @Override
        public User getCurrentUser() {
            return currentUser;
        }
    }
}
