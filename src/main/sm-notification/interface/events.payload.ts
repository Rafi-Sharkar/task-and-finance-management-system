import {
  DocumentApprovalMeta,
  FinanceMeta,
  ProjectAssignmentMeta,
  UserRegistrationMeta,
} from './event.name';

// Generic Base Event
export interface BaseEvent<TMeta> {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  meta: TMeta;
}

//  -------------Notification Base
export interface Notification {
  type: string;
  title: string;
  message: string;
  createdAt: Date;
  meta: Record<string, any>;
}

// -------------- User Registration Event ----------------
export interface UserRegistration extends BaseEvent<UserRegistrationMeta> {
  info: {
    email: string;
    id: string;
    name: string;
    role: string;
    recipients: { id: string; email: string }[];
  };
}

//  ------------------ Finance Event--------------
export interface FinanceEvent extends BaseEvent<FinanceMeta> {
  info: {
    totalIncome: string;
    totalExpense: string;
    totalVat: string;
    netProfit: string;
    summaryMonth: string;
    summaryYear: number;
    generatedAt: Date;
    recipients: { id: string; email: string }[];
  };
}
export interface ProjectAssignmentEvent extends BaseEvent<ProjectAssignmentMeta> {
  info: {
    projectId: string;
    projectName: string;
    createdBy: string;
    status: string;
    description: string;
    assignedBy: string;
    assignedAt: Date;
    recipients: { id: string; email: string }[];
  };
}

export interface DocumentStatus extends BaseEvent<DocumentApprovalMeta> {
  info: {
    id: string;
    documentname: string;
    documentCateory: string;
    status: string;
    statusByClient: string;
    uploadedBy: string;
    createdAt: Date;
    recipients: string[];
  };
}
