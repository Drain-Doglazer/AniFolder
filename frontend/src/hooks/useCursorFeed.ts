import {useInfiniteQuery} from '@tanstack/react-query';
import {CursorPaginatedResponse} from '../types/community';

export function useCursorFeed<T>(key: readonly unknown[], load:(cursor?:string)=>Promise<{data:CursorPaginatedResponse<T>}>) {
  return useInfiniteQuery({
    queryKey:key, initialPageParam:undefined as string|undefined,
    queryFn:({pageParam})=>load(pageParam), getNextPageParam:last=>last.data.next_cursor ?? undefined,
  });
}
