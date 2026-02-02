export const sendWelcomeAndUserCredentialMail = (
  to: string,
  username: string,
  password: string,
) => {
  return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to Our Platform!</h2>
        <p style="color: #666; line-height: 1.6;">Your account has been successfully created. Here are your login credentials:</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 5px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${password}</p>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-top: 20px;">
          For security reasons, please change your password upon your first login.
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
          If you did not create this account, please contact support immediately.
        </p>
      </div>
    `;
};
