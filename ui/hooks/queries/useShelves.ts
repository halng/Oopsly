import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchShelves, createShelf, updateShelve, deleteShelf, getShelfById } from "@/services/ShelfService";
import { ShelfCreateRequest, ShelfUpdateRequest, ShelfQueryParams } from "@/types/Shelf";
import Toast from "react-native-toast-message";

export const SHELVES_QUERY_KEY = ["shelves"];

export const useShelves = (params?: ShelfQueryParams) => {
  return useQuery({
    queryKey: [...SHELVES_QUERY_KEY, params],
    queryFn: async () => {
      const res = await fetchShelves(params);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
  });
};

export const useShelf = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...SHELVES_QUERY_KEY, id],
    queryFn: async () => {
      const res = await getShelfById(id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    enabled: !!id && enabled,
  });
};

export const useCreateShelf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ShelfCreateRequest) => {
      const res = await createShelf(data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      Toast.show({ type: "success", text1: "Shelf created successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to create shelf", text2: error.message });
    },
  });
};

export const useUpdateShelf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ShelfUpdateRequest }) => {
      const res = await updateShelve(id, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SHELVES_QUERY_KEY, variables.id] });
      Toast.show({ type: "success", text1: "Shelf updated successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to update shelf", text2: error.message });
    },
  });
};

export const useDeleteShelf = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteShelf(id);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHELVES_QUERY_KEY });
      Toast.show({ type: "success", text1: "Shelf deleted successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to delete shelf", text2: error.message });
    },
  });
};
