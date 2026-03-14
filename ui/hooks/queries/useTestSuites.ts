import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTestSuitesByShelf,
  createTestSuite,
  getCardsForTestSuite,
  deleteTestSuite,
  TestSuiteCreateReq,
} from "@/services/TestSuiteService";
import Toast from "react-native-toast-message";

export const TEST_SUITES_QUERY_KEY = ["testSuites"];

export const useTestSuites = (shelfId: string, enabled = true) => {
  return useQuery({
    queryKey: [...TEST_SUITES_QUERY_KEY, shelfId],
    queryFn: async () => {
      const res = await fetchTestSuitesByShelf(shelfId);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data || [];
    },
    enabled: !!shelfId && enabled,
  });
};

export const useTestSuiteCards = (testSuiteId: string, enabled = true) => {
  return useQuery({
    queryKey: [...TEST_SUITES_QUERY_KEY, "cards", testSuiteId],
    queryFn: async () => {
      const res = await getCardsForTestSuite(testSuiteId);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data || [];
    },
    enabled: !!testSuiteId && enabled,
  });
};

export const useCreateTestSuite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, data }: { shelfId: string; data: TestSuiteCreateReq }) => {
      const res = await createTestSuite(shelfId, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...TEST_SUITES_QUERY_KEY, variables.shelfId] });
      Toast.show({ type: "success", text1: "Test suite created successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to create test suite", text2: error.message });
    },
  });
};

export const useDeleteTestSuite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, id }: { shelfId: string; id: string }) => {
      const res = await deleteTestSuite(shelfId, id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...TEST_SUITES_QUERY_KEY, variables.shelfId] });
      Toast.show({ type: "success", text1: "Test suite deleted successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to delete test suite", text2: error.message });
    },
  });
};
