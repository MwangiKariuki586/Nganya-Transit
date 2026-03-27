import { useQuery } from '@tanstack/react-query'
import { adminDashboardService } from '@/modules/admin/services/admin-dashboard-service'
import { nganyaRegistrationService } from '@/features/nganya-registration/services/nganya-registration-service'

export const adminQueryKeys = {
  overview: () => ['admin', 'overview'] as const,
  users: () => ['admin', 'users'] as const,
  crewManagement: () => ['admin', 'crew-management'] as const,
  registrations: (limit = 50) => ['admin', 'registrations', limit] as const,
  registrationDetail: (requestId: string | null) => ['admin', 'registration-detail', requestId] as const,
}

export function useAdminOverviewQuery() {
  return useQuery({
    queryKey: adminQueryKeys.overview(),
    queryFn: () => adminDashboardService.getOverview(),
    staleTime: 60_000,
  })
}

export function useAdminUsersQuery() {
  return useQuery({
    queryKey: adminQueryKeys.users(),
    queryFn: () => adminDashboardService.listUsers(),
    staleTime: 45_000,
  })
}

export function useAdminCrewManagementQuery() {
  return useQuery({
    queryKey: adminQueryKeys.crewManagement(),
    queryFn: () => adminDashboardService.getCrewManagementData(),
    staleTime: 20_000,
  })
}

export function useAdminRegistrationsQuery(limit = 50) {
  return useQuery({
    queryKey: adminQueryKeys.registrations(limit),
    queryFn: () => nganyaRegistrationService.listAdminRequests({ limit }),
    staleTime: 15_000,
  })
}

export function useAdminRegistrationDetailQuery(requestId: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.registrationDetail(requestId),
    queryFn: () => nganyaRegistrationService.getAdminReviewData(requestId!),
    enabled: Boolean(requestId),
    staleTime: 15_000,
  })
}
