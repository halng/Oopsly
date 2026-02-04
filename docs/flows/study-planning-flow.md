# Study Planning Flow

This diagram shows how users plan and schedule their study sessions.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Opens Study Planner]) --> ViewCalendar[Display Weekly Calendar View<br/>Current week's schedule]
    ViewCalendar --> CheckSchedule{Has Scheduled Items?}
    CheckSchedule -->|Yes| DisplayEvents[Show Color-Coded Events<br/>Lectures, Study, Exams]
    CheckSchedule -->|No| EmptyState[Show "No events scheduled"]
    
    DisplayEvents --> UserAction
    EmptyState --> UserAction{User Action}
    
    UserAction -->|Add Event| SelectType[Select Event Type<br/>Lecture/Self-Study/Exam/Break]
    UserAction -->|Edit Event| SelectEvent[Select Existing Event]
    UserAction -->|View Day| DayDetails[View Single Day Schedule]
    UserAction -->|Done| Home
    
    SelectType --> TimeBlock[Drag to Create Time Block<br/>Set start & end time]
    TimeBlock --> AddDetails[Add Details<br/>Title, description, location]
    AddDetails --> LinkContent[Optional: Link to Shelve/Subject]
    LinkContent --> SetReminder[Set Reminder<br/>15min/1hr/1day before]
    SetReminder --> SaveEvent[Save Event<br/>POST /study-plan/events]
    SaveEvent --> SyncCalendar{Sync with External?}
    SyncCalendar -->|Yes| SyncGoogle[Sync with Google/Apple Calendar]
    SyncCalendar -->|No| ViewCalendar
    SyncGoogle --> ViewCalendar
    
    SelectEvent --> EditDetails[Edit Event Details]
    EditDetails --> UpdateEvent[Update Event<br/>PUT /study-plan/events/:id]
    UpdateEvent --> ViewCalendar
    
    DayDetails --> TaskList[View Tasks for Day]
    TaskList --> CheckTasks{Complete Tasks?}
    CheckTasks -->|Yes| MarkComplete[Mark Task Complete]
    CheckTasks -->|No| ViewCalendar
    MarkComplete --> UpdateStats[Update Daily Progress]
    UpdateStats --> ViewCalendar
```

## User Journey

1. User opens study planner
2. User views weekly calendar
3. User creates time blocks for study sessions
4. User adds details and links to subjects
5. User sets reminders
6. User can sync with external calendars
7. User tracks daily progress

## Key Features

- Weekly calendar view
- Time blocking interface
- Multiple event types (Lecture, Self-Study, Exam, Break)
- Color-coded activities
- Event details (title, description, location)
- Link events to shelves or subjects
- Reminder notifications (15 min, 1 hour, 1 day before)
- External calendar sync (Google/Apple)
- Daily progress tracking
- Task completion tracking
