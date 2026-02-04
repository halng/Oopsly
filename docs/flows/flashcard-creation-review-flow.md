# Flashcard Creation & Review Flow

This diagram shows the complete process of creating flashcards and reviewing them with spaced repetition.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Opens App]) --> CheckAuth{Authenticated?}
    CheckAuth -->|No| Auth[Authentication Flow]
    Auth --> Home
    CheckAuth -->|Yes| Home[Home Dashboard]
    
    Home --> SelectAction{Choose Action}
    
    SelectAction -->|Create Cards| CreateFlow[Start Card Creation]
    SelectAction -->|Review Cards| ReviewFlow[Start Card Review]
    
    CreateFlow --> SelectShelve[Select or Create Shelve]
    SelectShelve --> SelectSubject[Select or Create Subject]
    SelectSubject --> InputCard[Input Card Front & Back]
    InputCard --> SetDifficulty[Set Initial Difficulty]
    SetDifficulty --> SaveCard[POST /shelves/:id/subjects/:id/cards]
    SaveCard --> MoreCards{Create More?}
    MoreCards -->|Yes| InputCard
    MoreCards -->|No| Home
    
    ReviewFlow --> GetDueCards[GET /shelves/:id/subjects/:id/cards<br/>Filter: Due for review]
    GetDueCards --> HasCards{Cards Available?}
    HasCards -->|No| NoCards[Show "All caught up!" message]
    NoCards --> Home
    HasCards -->|Yes| ShowCard[Display Card Front]
    ShowCard --> UserFlip[User taps to flip]
    UserFlip --> ShowAnswer[Display Card Back]
    ShowAnswer --> UserRate[User swipes to rate difficulty<br/>← Hard | Easy →]
    UserRate --> UpdateCard[PUT /cards/:id/difficulty<br/>Calculate next review date]
    UpdateCard --> MoreInQueue{More Cards?}
    MoreInQueue -->|Yes| ShowCard
    MoreInQueue -->|No| ShowSummary[Show Review Summary<br/>Time, cards reviewed, streak]
    ShowSummary --> UpdateStats[Update Statistics]
    UpdateStats --> Home
```

## User Journey

### Card Creation Journey

1. User navigates to flashcard section
2. User creates or selects a subject/collection
3. User creates flashcards with front/back content
4. System schedules cards for review based on spaced repetition

### Card Review Journey

1. User starts review session
2. System shows cards due for review
3. User reviews due cards by rating difficulty
4. System calculates next review dates
5. User sees progress and statistics

## Key Features

- Hierarchical organization (Shelve → Subject → Cards)
- Spaced repetition algorithm
- Difficulty-based scheduling (Easy, Medium, Hard)
- Swipe gestures for rating
- Session statistics and tracking
- Progress visualization
