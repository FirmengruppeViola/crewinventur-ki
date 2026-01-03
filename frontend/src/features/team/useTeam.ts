import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../lib/api'

export type TeamMember = {
  id: string
  owner_id: string
  user_id: string | null
  name: string
  email: string | null
  role: string
  invitation_code: string | null
  invitation_expires_at: string | null
  invitation_accepted_at: string | null
  is_active: boolean
  created_at: string
  location_ids: string[]
}

export type TeamMemberCreate = {
  name: string
  email?: string
  location_ids: string[]
}

export type TeamMemberUpdate = {
  name?: string
  location_ids?: string[]
  is_active?: boolean
}

// Fetch all team members
export function useTeamMembers() {
  const queryClient = useQueryClient()
  const queryKey = ['team', 'members']
  return useQuery({
    queryKey,
    queryFn: () => apiRequest<TeamMember[]>('/api/v1/team/members'),
    placeholderData: () =>
      queryClient.getQueryData<TeamMember[]>(queryKey),
  })
}

// Fetch single team member
export function useTeamMember(id: string) {
  const queryClient = useQueryClient()
  const queryKey = ['team', 'members', id]
  return useQuery({
    queryKey,
    queryFn: () => apiRequest<TeamMember>(`/api/v1/team/members/${id}`),
    enabled: !!id,
    placeholderData: () =>
      id ? queryClient.getQueryData<TeamMember>(queryKey) : undefined,
  })
}

// Invite new team member
export function useInviteTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: TeamMemberCreate) =>
      apiRequest<TeamMember>('/api/v1/team/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
  })
}

// Update team member
export function useUpdateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TeamMemberUpdate }) =>
      apiRequest<TeamMember>(`/api/v1/team/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
  })
}

// Deactivate team member
export function useDeactivateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<TeamMember>(`/api/v1/team/members/${id}/deactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
  })
}

// Reactivate team member
export function useReactivateTeamMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<TeamMember>(`/api/v1/team/members/${id}/reactivate`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
  })
}

// Regenerate invitation code
export function useRegenerateCode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<TeamMember>(`/api/v1/team/members/${id}/regenerate-code`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
  })
}
