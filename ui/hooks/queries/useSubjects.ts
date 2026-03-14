import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSubject,
  getSubjectById,
  updateSubjectSetting,
  updateSubjectById,
  deleteSubject,
} from "@/services/SubjectService";
import { SubjectCreateRequest, SubjectSettings } from "@/types/Subject";
import Toast from "react-native-toast-message";
import { SHELVES_QUERY_KEY } from "./useShelves";

export const SUBJECTS_QUERY_KEY = ["subjects"];

export const useSubject = (shelfId: string, id: string, enabled = true) => {
  return useQuery({
    queryKey: [...SUBJECTS_QUERY_KEY, shelfId, id],
    queryFn: async () => {
      const res = await getSubjectById(shelfId, id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    enabled: !!shelfId && !!id && enabled,
  });
};

export const useCreateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, data }: { shelfId: string; data: SubjectCreateRequest }) => {
      const res = await createSubject(shelfId, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      Toast.show({ type: "success", text1: "Subject created successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to create subject", text2: error.message });
    },
  });
};

export const useUpdateSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, id, data }: { shelfId: string; id: string; data: SubjectCreateRequest }) => {
      const res = await updateSubjectById(shelfId, id, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBJECTS_QUERY_KEY, variables.shelfId, variables.id] });
      Toast.show({ type: "success", text1: "Subject updated successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to update subject", text2: error.message });
    },
  });
};

export const useUpdateSubjectSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, id, data }: { shelfId: string; id: string; data: SubjectSettings }) => {
      const res = await updateSubjectSetting(shelfId, id, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBJECTS_QUERY_KEY, variables.shelfId, variables.id] });
      Toast.show({ type: "success", text1: "Subject settings updated" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to update settings", text2: error.message });
    },
  });
};

export const useDeleteSubject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shelfId, id }: { shelfId: string; id: string }) => {
      const res = await deleteSubject(shelfId, id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SUBJECTS_QUERY_KEY, variables.shelfId] });
      Toast.show({ type: "success", text1: "Subject deleted successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to delete subject", text2: error.message });
    },
  });
};
