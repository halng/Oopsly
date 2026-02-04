# Test & Quiz Generation

## Definition

Flexible test creation system supporting three methods: manual question-by-question creation, AI-powered topic-based generation, and AI-driven document analysis for automatic test generation.

## Scope

### 2.1 Multiple Creation Methods

#### A. Topic-Based Generation (AI-Powered)

- Input a topic or subject area
- AI generates relevant questions automatically
- Customizable difficulty levels
- Adjustable question count (1-50 questions)

#### B. Document Upload Generation

- Upload documents (PDF, images, etc.)
- AI extracts content and generates questions
- Automatic topic identification
- Context-aware question generation

#### C. Manual Test Creation

- Create custom questions from scratch
- Full control over question content
- Support for multiple question types

### 2.2 Question Types & Configuration

**Supported Question Types:**

- Multiple Choice Questions (MCQ)
- True/False Questions
- Short Answer Questions

**Configuration Options:**

- Question count: 1-50 questions per test
- Difficulty levels: Easy, Medium, Hard
- Custom test titles and descriptions
- Type-specific metadata validation

### 2.3 Test Management

- Create and organize multiple test suites
- Hierarchical structure: Shelve → Test Suite → Questions
- Update existing tests
- Soft delete (recoverable)
- Cascading operations (deleting test suite removes all questions)

## Implementation Status

**Status:** 🔄 Partially Implemented

**isSuccess:** true

- ✅ Manual test creation: Fully functional
- 🔄 Topic-based AI generation: UI complete, backend AI integration in development
- 🔄 Document upload: UI complete, backend document processing in development
- ✅ Test management: CRUD operations complete
- ✅ Hierarchical organization: Implemented

## Acceptance Criteria

### Manual Creation

- [x] User can create test suite with title and description
- [x] User can add questions one by one
- [x] Support for MCQ, True/False, and Short Answer types
- [x] User can set difficulty level per question
- [x] User can update existing test questions
- [x] User can soft delete test suites
- [x] Deleting test suite cascades to all questions

### AI Topic-Based Generation

- [ ] User can input topic text
- [ ] User can set question count (1-50)
- [ ] User can select difficulty level
- [ ] AI generates contextually relevant questions
- [ ] User can review generated questions before saving
- [ ] User can edit generated questions
- [ ] Generation completes within 30 seconds for 20 questions

### AI Document Upload

- [ ] User can upload PDF documents
- [ ] User can upload images (JPG, PNG)
- [ ] System extracts text content from documents
- [ ] AI identifies key topics from content
- [ ] AI generates questions based on document content
- [ ] User can review and edit generated questions
