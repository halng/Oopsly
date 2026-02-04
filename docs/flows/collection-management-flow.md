# Collection Management Flow

This diagram shows how users organize content into shelves, subjects, and share with others.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Opens Collections]) --> ViewShelves[Display All Shelves<br/>GET /shelves<br/>Grid/List view]
    ViewShelves --> UserAction{User Action}
    
    UserAction -->|Create Shelve| CreateShelve[Create New Shelve]
    UserAction -->|Select Shelve| SelectShelve[Select Shelve Card]
    UserAction -->|Search| SearchShelves[Search Shelves<br/>By name or tag]
    UserAction -->|Done| Home
    
    CreateShelve --> InputName[Input Shelve Details<br/>Name, description, icon, color]
    InputName --> SaveShelve[POST /shelves<br/>Create shelve]
    SaveShelve --> ViewShelves
    
    SelectShelve --> ShelveDetails[Display Shelve Details<br/>GET /shelves/:id<br/>Subjects, test suites, stats]
    ShelveDetails --> ShelveAction{User Action}
    
    ShelveAction -->|Add Subject| CreateSubject[Create New Subject]
    ShelveAction -->|Add Test| CreateTestSuite[Create Test Suite]
    ShelveAction -->|Share| ShareFlow[Share Shelve]
    ShelveAction -->|Edit| EditShelve[Edit Shelve Details]
    ShelveAction -->|Delete| DeleteShelve[Soft Delete Shelve<br/>PATCH /shelves/:id]
    ShelveAction -->|View Subject| SelectSubject[Select Subject]
    ShelveAction -->|Back| ViewShelves
    
    CreateSubject --> InputSubject[Input Subject Details<br/>Name, description]
    InputSubject --> SaveSubject[POST /shelves/:id/subjects]
    SaveSubject --> ShelveDetails
    
    CreateTestSuite --> TestCreation[Go to Test Generation Flow]
    TestCreation --> ShelveDetails
    
    ShareFlow --> ShareMethod{Share Method}
    ShareMethod -->|Public Link| GenerateLink[Generate Public Link<br/>Read-only access]
    ShareMethod -->|Invite Users| InviteUsers[Input User Emails<br/>Set permissions]
    GenerateLink --> CopyLink[Copy Link to Clipboard<br/>Show "Link copied!" message]
    InviteUsers --> SendInvites[Send Email Invitations<br/>POST /shelves/:id/share]
    CopyLink --> ShareConfirm[Share Confirmation]
    SendInvites --> ShareConfirm
    ShareConfirm --> ShelveDetails
    
    EditShelve --> UpdateDetails[Update Name/Description/Color]
    UpdateDetails --> UpdateShelve[PUT /shelves/:id]
    UpdateShelve --> ShelveDetails
    
    DeleteShelve --> ConfirmDelete{Confirm Delete?}
    ConfirmDelete -->|Cancel| ShelveDetails
    ConfirmDelete -->|Confirm| SoftDelete[Mark as Deleted<br/>Cascade to subjects & cards]
    SoftDelete --> ViewShelves
    
    SelectSubject --> SubjectDetails[Display Subject Details<br/>GET /subjects/:id<br/>Cards, statistics]
    SubjectDetails --> SubjectAction{User Action}
    SubjectAction -->|Add Cards| CreateCards[Go to Card Creation]
    SubjectAction -->|Review| ReviewCards[Go to Card Review Flow]
    SubjectAction -->|Edit| EditSubject[Edit Subject]
    SubjectAction -->|Delete| DeleteSubject[Delete Subject<br/>PATCH /subjects/:id]
    SubjectAction -->|Back| ShelveDetails
    
    CreateCards --> CardCreation[Card Creation Form]
    CardCreation --> SubjectDetails
    ReviewCards --> ReviewFlow[Card Review Flow]
    ReviewFlow --> SubjectDetails
    EditSubject --> UpdateSubject[Update Subject Details]
    UpdateSubject --> SubjectDetails
    DeleteSubject --> SubjectDetails
    
    SearchShelves --> SearchResults[Display Search Results<br/>Filtered shelves]
    SearchResults --> SelectResult{Select Result?}
    SelectResult -->|Yes| SelectShelve
    SelectResult -->|No| ViewShelves
```

## User Journey

1. User views all their shelves (collections)
2. User creates a new shelve
3. User adds subjects to organize content
4. User adds flashcards or test suites to subjects
5. User can share shelve with others via link or email
6. User can edit or delete shelves/subjects
7. System maintains hierarchical organization
8. User can search across all shelves

## Key Features

- Hierarchical organization (Shelve → Subject → Cards/Tests)
- Grid/List view toggle
- Shelve customization (name, description, icon, color)
- CRUD operations for shelves and subjects
- Soft delete with cascading
- Public link sharing (read-only)
- Email invitation sharing with permissions
- Search functionality
- Subject-level statistics
- Card count tracking
- Pagination support for large collections
- UUID-based identification
