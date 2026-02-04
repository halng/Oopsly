# Goal Tracking Flow

This diagram shows how users set, track, and achieve study goals.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Opens Goal Tracker]) --> ViewGoals[Display Goal Dashboard<br/>Active goals, progress bars]
    ViewGoals --> CheckGoals{Has Goals?}
    CheckGoals -->|No| EmptyState[Show "Set your first goal"<br/>Motivational message]
    CheckGoals -->|Yes| DisplayGoals[Display Goal Cards<br/>Progress, deadline, status]
    
    EmptyState --> CreateGoal
    DisplayGoals --> UserAction{User Action}
    
    UserAction -->|Create New| CreateGoal[Create New Goal]
    UserAction -->|View Details| SelectGoal[Select Goal Card]
    UserAction -->|Edit| EditGoal[Edit Existing Goal]
    UserAction -->|Complete| MarkComplete[Mark Goal Complete]
    UserAction -->|Done| Home
    
    CreateGoal --> GoalType[Select Goal Type<br/>Study Hours/Cards Reviewed/<br/>Tests Completed/Subject Mastery]
    GoalType --> SetTarget[Set Target<br/>Quantity & timeframe<br/>e.g., "Review 100 cards in 7 days"]
    SetTarget --> AddDetails[Add Details<br/>Title, description, priority]
    AddDetails --> LinkContent[Optional: Link to Specific<br/>Shelve or Subject]
    LinkContent --> SetDeadline[Set Deadline Date]
    SetDeadline --> SetReminders[Configure Reminders<br/>Daily/Weekly notifications]
    SetReminders --> SaveGoal[Save Goal<br/>POST /goals]
    SaveGoal --> ViewGoals
    
    SelectGoal --> GoalDetails[Display Goal Details<br/>Progress chart<br/>Daily breakdown<br/>Streak calendar]
    GoalDetails --> CheckProgress[View Progress History<br/>Days completed<br/>Completion rate]
    CheckProgress --> LogActivity{Manual Log?}
    LogActivity -->|Yes| LogEntry[Log Activity<br/>Update progress]
    LogActivity -->|No| GoalDetails
    LogEntry --> UpdateProgress[Update Progress Bar<br/>Recalculate completion %]
    UpdateProgress --> GoalDetails
    
    EditGoal --> ModifyDetails[Modify Target/Deadline]
    ModifyDetails --> UpdateGoal[Update Goal<br/>PUT /goals/:id]
    UpdateGoal --> ViewGoals
    
    MarkComplete --> ConfirmComplete{Achieved?}
    ConfirmComplete -->|Yes| Celebrate[Show Celebration Animation<br/>"Goal Achieved!" 🎉]
    ConfirmComplete -->|No| AbandonGoal[Mark as Abandoned<br/>Optional: Reason]
    Celebrate --> RecordAchievement[Record Achievement<br/>Save to history]
    AbandonGoal --> ArchiveGoal[Move to Archive]
    RecordAchievement --> UpdateStats[Update Overall Statistics<br/>Goals completed count<br/>Success rate]
    ArchiveGoal --> ViewGoals
    UpdateStats --> SuggestNext[Suggest Next Goal<br/>Based on patterns]
    SuggestNext --> ViewGoals
```

## User Journey

1. User opens goal tracker
2. User creates a new study goal with target
3. User sets deadline and reminders
4. User tracks progress daily
5. System sends reminder notifications
6. User views progress charts and streaks
7. User completes goal or updates it
8. System celebrates achievement
9. System suggests next goals

## Key Features

- Goal dashboard with progress bars
- Multiple goal types (Study Hours, Cards Reviewed, Tests Completed, Subject Mastery)
- Target setting with timeframe
- Deadline tracking
- Priority levels (High, Medium, Low)
- Link goals to specific shelves or subjects
- Reminder notifications (Daily/Weekly)
- Progress charts and visualizations
- Daily breakdown
- Streak calendar
- Manual activity logging
- Completion rate tracking
- Celebration animations for achievements
- Goal history archive
- Smart goal suggestions based on patterns
