import {
  approveRegistrationRequestServerFn,
  createRegistrationRequestServerFn,
  getAdminRegistrationReviewDataServerFn,
  listAdminRegistrationRequestsServerFn,
  listOwnRegistrationRequestsServerFn,
  reviewRegistrationRequestServerFn,
} from '@/shared/server-fns/nganya-registrations'

export const nganyaRegistrationRepository = {
  listMine: listOwnRegistrationRequestsServerFn,
  create: createRegistrationRequestServerFn,
  listAdmin: listAdminRegistrationRequestsServerFn,
  getAdminReviewData: getAdminRegistrationReviewDataServerFn,
  review: reviewRegistrationRequestServerFn,
  approve: approveRegistrationRequestServerFn,
}
