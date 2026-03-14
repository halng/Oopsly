export enum QuestionType {
  SINGLE_CHOICE = "SINGLE_CHOICE",
  MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
  TRUE_FALSE = "TRUE_FALSE",
  FILL_IN_THE_BLANK = "FILL_IN_THE_BLANK",
}

export interface Question {
  id: string;
  testSuiteId: string;
  content: string;
  type: QuestionType;
  options: string[];
  correctOptionIndices: number[];
  explanation?: string;
}

export interface QuestionCreateReq {
  content: string;
  type: QuestionType;
  options: string[];
  correctOptionIndices: number[];
  explanation?: string;
}
