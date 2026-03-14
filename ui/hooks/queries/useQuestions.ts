import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchQuestionsByTestSuite,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from "@/services/QuestionService";
import { QuestionCreateReq } from "@/types/Question";
import Toast from "react-native-toast-message";

export const QUESTIONS_QUERY_KEY = ["questions"];

export const useQuestions = (testSuiteId: string, enabled = true) => {
  return useQuery({
    queryKey: [...QUESTIONS_QUERY_KEY, testSuiteId],
    queryFn: async () => {
      const res = await fetchQuestionsByTestSuite(testSuiteId);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data || [];
    },
    enabled: !!testSuiteId && enabled,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testSuiteId, data }: { testSuiteId: string; data: QuestionCreateReq }) => {
      const res = await createQuestion(testSuiteId, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUESTIONS_QUERY_KEY, variables.testSuiteId] });
      Toast.show({ type: "success", text1: "Question created successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to create question", text2: error.message });
    },
  });
};

export const useUpdateQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testSuiteId, id, data }: { testSuiteId: string; id: string; data: QuestionCreateReq }) => {
      const res = await updateQuestion(testSuiteId, id, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUESTIONS_QUERY_KEY, variables.testSuiteId] });
      Toast.show({ type: "success", text1: "Question updated successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to update question", text2: error.message });
    },
  });
};

export const useDeleteQuestion = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ testSuiteId, id }: { testSuiteId: string; id: string }) => {
      const res = await deleteQuestion(testSuiteId, id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...QUESTIONS_QUERY_KEY, variables.testSuiteId] });
      Toast.show({ type: "success", text1: "Question deleted successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to delete question", text2: error.message });
    },
  });
};
