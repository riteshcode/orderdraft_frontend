import { useQuery } from '@tanstack/react-query'
import { api, auth } from '@/lib/api'
import type { Me, Role } from '@/lib/types'

/** Logged-in user + tenant + usage. Header, permissions sab isse. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<Me>('/auth/me'),
    enabled: !!auth.getToken(),
    staleTime: 30_000,
  })
}

/** can('owner', 'admin') -> current user ka role in mein hai? */
export function usePermission() {
  const { data } = useMe()
  return {
    role: data?.role,
    can: (...roles: Role[]) => !!data && roles.includes(data.role),
    isAdmin: !!data && ['owner', 'admin'].includes(data.role),
    isOwner: data?.role === 'owner',
  }
}
