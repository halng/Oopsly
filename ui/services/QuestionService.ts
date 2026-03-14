import { ApiResponse } from "@/types/ApiRes";
import { Question, QuestionCreateReq } from "@/types/Question";
import { apiClient } from ".";

const QUESTION_ENDPOINTS = {
  BASE: (testSuiteId: string) => `/test-suites/${testSuiteId}/questions`,
  BY_ID: (testSuiteId: string, id: string) => `/test-suites/${testSuiteId}/questions/${id}`,
};

const fetchQuestionsByTestSuite = async (
  testSuiteId: string
): Promise<ApiResponse<Question[]>> => {
  const response = await apiClient.get(QUESTION_ENDPOINTS.BASE(testSuiteId));
  return response.data;
};

const createQuestion = async (
  testSuiteId: string,
  data: QuestionCreateReq
): Promise<ApiResponse<Question>> => {
  const response = await apiClient.post(
    QUESTION_ENDPOINTS.BASE(testSuiteId),
    data
  );
  return response.data;
};

const updateQuestion = async (
  testSuiteId: string,
  id: string,
  data: QuestionCreateReq
): Promise<ApiResponse<Question>> => {
  const response = await apiClient.put(
    QUESTION_ENDPOINTS.BY_ID(testSuiteId, id),
    data
  );
  return response.data;
};

const deleteQuestion = async (
  testSuiteId: string,
  id: string
): Promise<ApiResponse<null>> => {
  const response = await apiClient.delete(
    QUESTION_ENDPOINTS.BY_ID(testSuiteId, id)
  );
  return response.data;
};

export {
  fetchQuestionsByTestSuite,
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
