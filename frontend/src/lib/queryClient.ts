import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 Minuten - verhindert unnötige Reloads
      gcTime: 1000 * 60 * 10,   // 10 Minuten Cache
    },
  },
})
