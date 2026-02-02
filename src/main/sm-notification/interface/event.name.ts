export interface UserRegistrationMeta {
  action: 'created';
  info: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    createdAt: Date;
    recipients: Array<{
      id: string;
      email: string;
    }>;
  };
  meta?: Record<string, any>;
}
export interface DocumentApprovalMeta {
  documentId: string;
  name: string;
  publishedAt: Date;
}

export interface FinanceMeta {
  totalIncome: string;
  totalExpense: string;
  totalVat: string;
  netProfit: string;
  summaryMonth: string;
  summaryYear: number;
  generatedAt: Date;
}

export interface ProjectAssignmentMeta {
  projectId: string;
  projectName: string;
  createdBy: string;
  status: string;
  description: string;
  assignedBy: string;
  assignedAt: Date;
}

// EVENT TYPE CONSTANTS
export const EVENT_TYPES = {
  USERREGISTRATION_CREATE: 'user.create',
  USERREGISTRATION_UPDATE: 'user.update',
  USERREGISTRATION_DELETE: 'user.delete',

  FINANCE_SUMMARY_GENERATED: 'finance.summary.generated',
  DOCUMENT_APPROVAL: 'document.approval',
  PROJECT_ASSIGNMENT: 'project.assignment',
} as const;

// Type-safe keys
export type EventType = keyof typeof EVENT_TYPES;

// Event payload mapping
export type EventPayloadMap = {
  [EVENT_TYPES.USERREGISTRATION_CREATE]: UserRegistrationMeta;
  [EVENT_TYPES.USERREGISTRATION_UPDATE]: UserRegistrationMeta;
  [EVENT_TYPES.USERREGISTRATION_DELETE]: UserRegistrationMeta;
  [EVENT_TYPES.FINANCE_SUMMARY_GENERATED]: FinanceMeta;
  [EVENT_TYPES.DOCUMENT_APPROVAL]: DocumentApprovalMeta;
  [EVENT_TYPES.PROJECT_ASSIGNMENT]: ProjectAssignmentMeta;
};
