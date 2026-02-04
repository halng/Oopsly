# Pomodoro Study Session Flow

This diagram shows the focused study session using the Pomodoro technique.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Starts Pomodoro]) --> SelectMode[Select Study Mode<br/>Flashcards/Reading/Practice]
    SelectMode --> SelectContent[Select Content<br/>Subject or Test Suite]
    SelectContent --> ConfigPomodoro[Configure Pomodoro<br/>Focus: 25min<br/>Short Break: 5min<br/>Long Break: 15min<br/>Sessions before long break: 4]
    ConfigPomodoro --> OptionalBG[Optional: Select Background Sound<br/>White Noise/Rain/Lo-fi/Silent]
    OptionalBG --> StartSession[Start Focus Session]
    
    StartSession --> FocusMode[Enter Focus Mode<br/>Minimize distractions<br/>Display countdown timer<br/>Lock navigation optional]
    FocusMode --> StudyContent[Display Study Content<br/>Based on selected mode]
    StudyContent --> TimerRunning{Timer Active?}
    
    TimerRunning -->|Counting Down| CheckComplete{25min Complete?}
    CheckComplete -->|No| AllowPause{User Pauses?}
    AllowPause -->|No| TimerRunning
    AllowPause -->|Yes| PauseState[Paused State<br/>Allow resume or quit]
    PauseState --> ResumeQuit{Resume or Quit?}
    ResumeQuit -->|Resume| TimerRunning
    ResumeQuit -->|Quit| EndEarly[End Session Early<br/>Record partial time]
    EndEarly --> SessionSummary
    
    CheckComplete -->|Yes| PlaySound[Play Completion Sound<br/>Haptic feedback]
    PlaySound --> IncrementCount[Increment Session Count]
    IncrementCount --> RecordTime[Record Focus Time<br/>Save to statistics]
    RecordTime --> CheckBreak{Need Long Break?}
    CheckBreak -->|Every 4 sessions| LongBreak[Long Break: 15 minutes<br/>Encourage user to rest]
    CheckBreak -->|Otherwise| ShortBreak[Short Break: 5 minutes<br/>Optional stretching tips]
    
    LongBreak --> BreakTimer[Display Break Timer]
    ShortBreak --> BreakTimer
    BreakTimer --> BreakEnd{Break Complete?}
    BreakEnd -->|Yes| ContinueStudy{Continue Studying?}
    BreakEnd -->|No| BreakTimer
    
    ContinueStudy -->|Yes| StartSession
    ContinueStudy -->|No| SessionSummary[Display Session Summary<br/>Total focus time<br/>Sessions completed<br/>Cards reviewed/Questions answered]
    
    SessionSummary --> RateSession[Rate Focus Level<br/>1-5 stars]
    RateSession --> SaveSession[Save Session Data<br/>POST /study-sessions]
    SaveSession --> UpdateStreak[Update Study Streak]
    UpdateStreak --> CheckAchievements[Check for Achievements<br/>"5 sessions in a row!"<br/>"100 total sessions!"]
    CheckAchievements --> ShowReward{Achievement Unlocked?}
    ShowReward -->|Yes| DisplayBadge[Display Badge/Reward]
    ShowReward -->|No| Home
    DisplayBadge --> Home[Return to Home]
```

## User Journey

1. User selects Pomodoro timer
2. User chooses study content
3. User configures timer settings
4. User starts 25-minute focus session
5. User studies with minimal distractions
6. Timer completes, user takes 5-minute break
7. After 4 sessions, user takes 15-minute long break
8. User reviews session summary and stats
9. System updates streaks and achievements

## Key Features

- 25-minute focus sessions
- 5-minute short breaks
- 15-minute long breaks (after 4 sessions)
- Focus mode with minimal distractions
- Visual countdown timer
- Screen wake lock (stays on during session)
- Pause/resume functionality
- Background sound options (white noise, rain, lo-fi, silent)
- Session completion tracking
- Haptic feedback and sound alerts
- Session summary (time, cards reviewed, questions answered)
- Focus level rating
- Study streak tracking
- Achievement system
