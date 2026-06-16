// Error message mapping utility
// Requirements: 17.1, 17.2, 17.3

/**
 * Standard error codes used throughout the application
 */
export const ERROR_CODES = {
  // Authentication & Authorization
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  UNIQUE_CONSTRAINT_VIOLATION: 'UNIQUE_CONSTRAINT_VIOLATION',
  
  // Network & Server
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Business logic
  ALREADY_APPLIED: 'ALREADY_APPLIED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  DOMAIN_DISABLED: 'DOMAIN_DISABLED',
  
  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * User-friendly error messages mapped to error codes
 * Requirement: 17.1, 17.2, 17.3 - Clear error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Please sign in to continue',
  [ERROR_CODES.AUTHORIZATION_ERROR]: 'Access Denied: You do not have permission to perform this action',
  [ERROR_CODES.ACCESS_DENIED]: 'Access Denied: You do not have permission to perform this action',
  
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again',
  [ERROR_CODES.REQUIRED_FIELD_MISSING]: 'Please fill in all required fields',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided',
  
  // Resource errors
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found',
  [ERROR_CODES.ALREADY_EXISTS]: 'A record with this information already exists',
  [ERROR_CODES.UNIQUE_CONSTRAINT_VIOLATION]: 'A record with this information already exists',
  
  // Network & Server
  [ERROR_CODES.NETWORK_ERROR]: 'Connection Error: Please check your internet connection',
  [ERROR_CODES.CONNECTION_ERROR]: 'Connection Error: Please check your internet connection',
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again later',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again',
  
  // Business logic
  [ERROR_CODES.ALREADY_APPLIED]: 'You have already applied to this job',
  [ERROR_CODES.INVALID_STATUS_TRANSITION]: 'Invalid status change',
  [ERROR_CODES.DOMAIN_DISABLED]: 'This domain has been disabled',
  
  // Unknown
  [ERROR_CODES.UNKNOWN_ERROR]: 'An unexpected error occurred',
};

/**
 * Get user-friendly error message from error code
 * Requirement: 17.1, 17.2, 17.3
 */
export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code as ErrorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

/**
 * Extract error message from various error formats
 * Handles API errors, Error objects, and string messages
 */
export function extractErrorMessage(error: unknown): string {
  // Handle direct API error payloads like { code, message, timestamp }
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    const apiError = error as { code?: string; message?: string };
    if (apiError.code) {
      return getErrorMessage(apiError.code);
    }
    return apiError.message ?? ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  }

  // Handle API error response format
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as { error: { code?: string; message?: string } };
    if (apiError.error.code) {
      return getErrorMessage(apiError.error.code);
    }
    if (apiError.error.message) {
      return apiError.error.message;
    }
  }
  
  // Handle axios error format
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { data?: { error?: { code?: string; message?: string } } } };
    if (axiosError.response?.data?.error?.code) {
      return getErrorMessage(axiosError.response.data.error.code);
    }
    if (axiosError.response?.data?.error?.message) {
      return axiosError.response.data.error.message;
    }
  }
  
  // Handle Error object
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback
  return ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

/**
 * Field-specific validation error messages
 * Requirement: 17.1 - Field-specific error messages
 */
export const FIELD_VALIDATION_MESSAGES = {
  // Job fields
  jobTitle: {
    required: 'Job title is required',
    minLength: 'Job title must be at least 5 characters',
    maxLength: 'Job title must not exceed 200 characters',
  },
  jobDescription: {
    required: 'Job description is required',
    minLength: 'Job description must be at least 20 characters',
    maxLength: 'Job description must not exceed 5000 characters',
  },
  requiredSkills: {
    required: 'At least one required skill must be specified',
    empty: 'Skills list cannot be empty',
  },
  
  // Profile fields
  candidateSkills: {
    required: 'At least one skill is required',
    empty: 'Skills list cannot be empty',
  },
  
  // Domain fields
  domainName: {
    required: 'Domain name is required',
    invalid: 'Invalid domain name format',
    exists: 'A domain with this name already exists',
  },
  name: {
    required: 'Name is required',
  },
  
  // User fields
  email: {
    required: 'Email is required',
    invalid: 'Invalid email format',
    exists: 'A user with this email already exists',
  },
  role: {
    required: 'Role is required',
    invalid: 'Invalid role specified',
  },
} as const;

/**
 * Get field validation message
 */
export function getFieldValidationMessage(
  field: keyof typeof FIELD_VALIDATION_MESSAGES,
  validationType: string
): string {
  const fieldMessages = FIELD_VALIDATION_MESSAGES[field];
  if (fieldMessages && validationType in fieldMessages) {
    return fieldMessages[validationType as keyof typeof fieldMessages];
  }
  return 'Invalid input';
}
