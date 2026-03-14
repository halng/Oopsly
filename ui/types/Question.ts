export interface Question {
  id: string;
  testSuiteId: string;
  content: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

export interface QuestionCreateReq {
  content: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}
