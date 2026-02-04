# Collections & Shelves

## Definition

Hierarchical content organization system allowing users to create collections (shelves) that contain subjects and test suites, with support for sharing and collaboration.

## Scope

### 4.1 Shelve Management

#### Organization

- Create collections (shelves) for related content
- Organize subjects within shelves
- Organize test suites within shelves
- Hierarchical content structure

#### Shelve Features

- Create, read, update, delete (CRUD) operations
- Pagination support for large collections
- Soft delete with recovery
- UUID-based unique identification

### 4.2 Subject Management

#### Subject Organization

- Create subjects within shelves
- Group related flashcards by subject
- Subject-level statistics
- Cascading deletes (removes all cards)

#### Features

- Paginated subject listings
- Subject-specific card management
- Update subject metadata
- Soft delete with cascading

### 4.3 Sharing & Collaboration

- Share shelves with other users
- Collaborative study collections
- Access control and permissions

## Implementation Status

**Status:** ✅ Fully Implemented

**isSuccess:** true

The collections system is complete with:

- Full CRUD operations for shelves and subjects
- Hierarchical organization (Shelve → Subject → Cards)
- Pagination support
- Soft delete with cascading
- UUID-based identification
- Sharing functionality (basic implementation)

## Acceptance Criteria

### Shelve Management

- [x] User can create shelve with name, description, icon, and color
- [x] User can view all their shelves
- [x] User can update shelve details
- [x] User can soft delete shelve
- [x] Deleting shelve cascades to subjects and cards
- [x] User can paginate through large shelve lists
- [x] Each shelve has unique UUID identifier

### Subject Management

- [x] User can create subject within a shelve
- [x] User can view all subjects in a shelve
- [x] User can update subject details
- [x] User can soft delete subject
- [x] Deleting subject cascades to all cards
- [x] Subject shows card count and statistics
- [x] Subjects support pagination

### Sharing & Collaboration

- [x] User can generate public link for shelve
- [x] User can invite others via email
- [x] Shared shelves are read-only by default
- [ ] User can set permissions (view/edit)
- [ ] User can revoke access
- [ ] User can see who has access to shelve
