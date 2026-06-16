// Dashboard-specific types for navigation, filters, and mutations

import type { Role, ApplicationStatus } from '@/generated/prisma';

// ============================================================================
// Navigation Types
// ============================================================================

/**
 * Job filter options for navigation and filtering
 */
export interface JobFilter {
  skills?: string[];
  minMatchScore?: number;
  domainId?: string;
  recruiterId?: string;
}

/**
 * Application filter options for navigation and filtering
 */
export interface ApplicationFilter {
  status?: ApplicationStatus[];
  minMatchScore?: number;
  sortBy?: 'date' | 'score';
}

/**
 * User filter options for admin views
 */
export interface UserFilter {
  role?: Role;
  domainId?: string;
}

/**
 * Navigation handler interface for dashboard actions
 * Provides type-safe navigation methods for all dashboard interactions
 */
export interface NavigationHandler {
  // Candidate navigation
  navigateToJobs: (filter?: JobFilter) => void;
  navigateToProfile: () => void;
  navigateToApplication: (id: string) => void;
  
  // Job detail navigation
  navigateToJobDetail: (id: string) => void;
  
  // Recruiter navigation
  navigateToRecruiterJobs: () => void;
  navigateToRecruiterApplications: (filter?: ApplicationFilter) => void;
  
  // Company Admin navigation
  navigateToTeamManagement: () => void;
  navigateToAdminJobs: () => void;
  
  // Super Admin navigation
  navigateToDomainManagement: () => void;
  navigateToUserManagement: (filter?: UserFilter) => void;
  
  // Modal actions
  openCreateJobModal: () => void;
  openInviteModal: () => void;
  openCreateDomainModal: () => void;
  closeModal: () => void;
}

// ============================================================================
// Mutation Input Types
// ============================================================================

/**
 * Input for creating a new job posting
 * Requirements: 5.2, 5.5, 5.6
 */
export interface CreateJobInput {
  title: string;
  description: string;
  requiredSkills: string[];
}

/**
 * Input for updating an existing job posting
 */
export interface UpdateJobInput {
  id: string;
  title?: string;
  description?: string;
  requiredSkills?: string[];
}

/**
 * Input for creating a job application
 * Requirements: 3.2, 3.3
 */
export interface CreateApplicationInput {
  jobId: string;
  candidateSkills: string[];
}

/**
 * Input for updating application status
 * Requirements: 7.4, 7.5, 7.6
 */
export interface UpdateApplicationStatusInput {
  applicationId: string;
  status: ApplicationStatus;
}

/**
 * Input for updating candidate profile
 * Requirements: 2.3, 2.5
 */
export interface UpdateProfileInput {
  skills: string[];
}

/**
 * Input for creating a new domain
 * Requirements: 12.4, 12.5
 */
export interface CreateDomainInput {
  name: string;
  domainName: string;
}

/**
 * Input for updating user role
 * Requirements: 13.6, 13.7
 */
export interface UpdateUserRoleInput {
  userId: string;
  role: Role;
}

/**
 * Input for sending recruiter invitation
 * Requirements: 9.5, 9.6
 */
export interface SendInvitationInput {
  email: string;
  role?: Role;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

/**
 * Mutation result with success/error state
 */
export interface MutationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
