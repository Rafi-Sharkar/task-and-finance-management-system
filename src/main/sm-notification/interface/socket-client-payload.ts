export type PayloadForSocketClient = {
  sub: string;
  email: string;
  userUpdates: boolean;
  userRegistration: boolean;
  Finance: boolean;
  documentApproval: boolean;
  projectAssignment: boolean;
};
