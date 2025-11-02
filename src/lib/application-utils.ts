'use server';
import { doc, setDoc, updateDoc, serverTimestamp, type Firestore } from 'firebase/firestore';
import type { CompanyApplication } from './definitions';

/**
 * Approves a company application
 */
export async function approveApplication(
  firestore: Firestore,
  applicationId: string,
  application: CompanyApplication,
  adminUserId: string
): Promise<void> {
  // 1. Create Company document
  const companyRef = doc(firestore, 'companies', applicationId);
  await setDoc(companyRef, {
    name: application.companyName,
    orgNumber: application.orgNumber,
    companyType: application.companyType,
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone,
    contactPerson: application.contactPerson,
    visitingAddress: application.visitingAddress,
    billingAddress: application.billingAddress,
    shippingAddresses: [
      {
        id: 'default',
        label: 'Default Delivery Address',
        ...application.deliveryAddress,
        isDefault: true,
      }
    ],
    active: true,
    approved: true,
    registeredAt: application.submittedAt,
    approvedAt: serverTimestamp(),
    approvedBy: adminUserId,
    userId: application.userId,
  });

  // 2. Update user role and status
  const userRef = doc(firestore, 'users', application.userId);
  await updateDoc(userRef, {
    role: 'customer',
    companyId: applicationId,
    approved: true,
    active: true,
  });

  // 3. Update application status
  const applicationRef = doc(firestore, 'companyApplications', applicationId);
  await updateDoc(applicationRef, {
    status: 'approved',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUserId,
  });

  // 4. Send approval email (to be implemented later)
  // await sendApprovalEmail(application.contactEmail, application.companyName);
}

/**
 * Rejects a company application
 */
export async function rejectApplication(
  firestore: Firestore,
  applicationId: string,
  application: CompanyApplication,
  adminUserId: string,
  reason: string
): Promise<void> {
  // 1. Update application status
  const applicationRef = doc(firestore, 'companyApplications', applicationId);
  await updateDoc(applicationRef, {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUserId,
    rejectionReason: reason,
  });

  // 2. Update user role to 'rejected'
  const userRef = doc(firestore, 'users', application.userId);
  await updateDoc(userRef, {
    role: 'rejected',
    active: false,
    approved: false,
  });

  // 3. Send rejection email (to be implemented later)
  // await sendRejectionEmail(application.contactEmail, application.companyName, reason);
}
