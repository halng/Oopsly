# Test Taking Flow

This diagram shows the complete test-taking experience from start to results.

## Flow Diagram

```mermaid
flowchart TD
    Start([User Wants to Take Test]) --> BrowseTests[Browse Available Tests<br/>GET /shelves/:id/test-suites]
    BrowseTests --> SelectTest[Select Test Suite]
    SelectTest --> ViewDetails[View Test Details<br/>GET /test-suites/:id<br/>Questions, time limit, passing score]
    ViewDetails --> StartTest{Start Test?}
    StartTest -->|Cancel| BrowseTests
    StartTest -->|Start| InitSession[Initialize Test Session<br/>Load all questions<br/>Start timer if configured]
    
    InitSession --> ShowQuestion[Display Question<br/>Question 1 of N]
    ShowQuestion --> QuestionType{Question Type?}
    
    QuestionType -->|MCQ| ShowOptions[Display Multiple Options<br/>Single/Multiple Select]
    QuestionType -->|True/False| ShowTF[Display True/False Buttons]
    QuestionType -->|Short Answer| ShowInput[Display Text Input Field]
    
    ShowOptions --> UserAnswer
    ShowTF --> UserAnswer
    ShowInput --> UserAnswer[User Submits Answer]
    
    UserAnswer --> SaveAnswer[Store Answer Locally]
    SaveAnswer --> CheckProgress{More Questions?}
    CheckProgress -->|Yes| NextQuestion[Go to Next Question]
    NextQuestion --> ShowQuestion
    CheckProgress -->|No| ConfirmSubmit{Submit Test?}
    ConfirmSubmit -->|Review| ReviewAnswers[Review All Answers<br/>Navigate to any question]
    ReviewAnswers --> ConfirmSubmit
    ConfirmSubmit -->|Submit| CalculateScore[Calculate Score<br/>Compare with correct answers]
    
    CalculateScore --> SaveResults[Save Test Results<br/>POST /test-results]
    SaveResults --> ShowResults[Display Results<br/>Score, percentage, pass/fail]
    ShowResults --> ShowBreakdown[Question-by-Question Breakdown<br/>Correct answers highlighted]
    ShowBreakdown --> Options{Next Action}
    Options -->|Retake| InitSession
    Options -->|Review| ReviewAnswers
    Options -->|Done| Home[Return to Home]
```

## User Journey

1. User browses available test suites
2. User selects a test to take
3. User reviews test details (question count, time limit)
4. User starts test and answers questions
5. User can navigate between questions
6. User submits test
7. System calculates score
8. User views results with detailed breakdown
9. User can retake or return to home

## Key Features

- Browse and select from available tests
- View test details before starting
- Support for multiple question types (MCQ, True/False, Short Answer)
- Question navigation (next, previous, jump to question)
- Answer review before submission
- Immediate score calculation
- Detailed results breakdown
- Retry capability
- Test history tracking
