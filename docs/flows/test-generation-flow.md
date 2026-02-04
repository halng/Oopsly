# Test Generation Flow

This diagram shows the three methods of test generation: manual, topic-based (AI), and document upload (AI).

## Flow Diagram

```mermaid
flowchart TD
    Start([User Wants to Create Test]) --> Home[Home Dashboard]
    Home --> SelectMethod{Choose Creation Method}
    
    SelectMethod -->|Manual| ManualFlow[Manual Test Creation]
    SelectMethod -->|Topic| TopicFlow[AI Topic Generation]
    SelectMethod -->|Document| DocFlow[AI Document Upload]
    
    %% Manual Flow
    ManualFlow --> SelectShelve1[Select Shelve]
    SelectShelve1 --> CreateTest1[POST /shelves/:id/test-suites<br/>Create test suite]
    CreateTest1 --> AddQuestion[Add Question Manually]
    AddQuestion --> InputQuestion[Input: Question text, type, options]
    InputQuestion --> SaveQuestion[POST /test-suites/:id/questions]
    SaveQuestion --> MoreQuestions{Add More?}
    MoreQuestions -->|Yes| AddQuestion
    MoreQuestions -->|No| TestReady
    
    %% Topic-based AI Flow (In Development)
    TopicFlow --> InputTopic[Input Topic/Subject]
    InputTopic --> SetParams[Set Parameters<br/>Count: 1-50<br/>Difficulty: Easy/Med/Hard<br/>Types: MCQ/TF/SA]
    SetParams --> ShowProgress[Show "Generating..." progress]
    ShowProgress --> CallAI[AI Service Generates Questions<br/>Status: In Development]
    CallAI --> ReviewGenerated[Review Generated Questions]
    ReviewGenerated --> EditIfNeeded[Edit/Remove Questions]
    EditIfNeeded --> SaveAll[Batch Save Questions]
    SaveAll --> TestReady
    
    %% Document Upload Flow (In Development)
    DocFlow --> UploadDoc[Upload Document<br/>PDF, Image, etc.]
    UploadDoc --> ParseDoc[Parse Document Content<br/>Status: In Development]
    ParseDoc --> ExtractTopics[AI Extracts Key Topics]
    ExtractTopics --> ShowProgress
    
    TestReady[Test Suite Ready] --> TestDetails[View Test Details<br/>Question count, difficulty]
    TestDetails --> Options{Next Action}
    Options -->|Take Test| TakeTest[Go to Test Taking]
    Options -->|Edit| AddQuestion
    Options -->|Done| Home
```

## User Journey - Manual Creation

1. User selects "Create Test Manually"
2. User creates a test suite
3. User adds questions one by one
4. User saves test and can take it or share it

## User Journey - AI Generation (In Development)

1. User selects "Generate from Topic"
2. User enters topic and parameters
3. AI generates relevant questions
4. User reviews and edits generated questions
5. User saves test suite

## User Journey - Document Upload (In Development)

1. User selects "Generate from Document"
2. User uploads PDF or image
3. AI extracts content and identifies topics
4. AI generates contextually relevant questions
5. User reviews and saves test suite

## Key Features

- Three creation methods: Manual, Topic-based AI, Document AI
- Support for MCQ, True/False, Short Answer questions
- Configurable difficulty levels (Easy, Medium, Hard)
- Question count: 1-50 per test
- Review and edit generated questions
- Hierarchical organization within shelves
