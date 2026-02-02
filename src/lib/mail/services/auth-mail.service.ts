import { Injectable } from '@nestjs/common';
import * as he from 'he';
import * as nodemailer from 'nodemailer';
import { MailService } from '../mail.service';
import { otpTemplate } from '../templates/otp.template';
import { passwordResetConfirmationTemplate } from '../templates/reset-password-confirm.template';

interface EmailOptions {
  subject?: string;
  message?: string;
}

@Injectable()
export class AuthMailService {
  constructor(private readonly mailService: MailService) {}

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<nodemailer.SentMessageInfo> {
    return this.mailService.sendMail({ to, subject, html, text });
  }

  private sanitize(input: string) {
    return he.encode(input);
  }

  async sendVerificationCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Verify your account');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Verification Code';

    return this.sendEmail(
      to,
      subject,
      otpTemplate({
        title: '🔑 Verify Your Account',
        message,
        code: safeCode,
        footer:
          'If you didn’t request this code, you can safely ignore this email.',
      }),
      `${message}\nYour verification code: ${code}`,
    );
  }

  async sendResetPasswordCodeEmail(
    to: string,
    code: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(options.message || 'Password Reset Request');
    const safeCode = this.sanitize(code);
    const subject = options.subject || 'Password Reset Code';

    return this.sendEmail(
      to,
      subject,
      otpTemplate({
        title: '🔒 Password Reset Request',
        message,
        code: safeCode,
        footer:
          'If you didn’t request a password reset, you can safely ignore this email.',
      }),
      `${message}\nYour password reset code: ${code}\n\nIf you did not request this, please ignore this email.`,
    );
  }

  async sendPasswordResetConfirmationEmail(
    to: string,
    options: EmailOptions = {},
  ): Promise<nodemailer.SentMessageInfo> {
    const message = this.sanitize(
      options.message || 'Password Reset Confirmation',
    );
    const subject = options.subject || 'Password Reset Confirmation';

    return this.sendEmail(
      to,
      subject,
      passwordResetConfirmationTemplate(message),
      message,
    );
  }

  async sendRegistrationEmail(
    to: string,
    username: string,
    password: string,
    role: string,
    frontendUrl?: string,
  ): Promise<nodemailer.SentMessageInfo> {
    const safeUsername = this.sanitize(username);
    const safePassword = this.sanitize(password);
    const safeEmail = this.sanitize(to);
    const safeRole = this.sanitize(role);
    const subject = `Welcome! Your Account Has Been Created as ${safeRole}`;

    // Construct password update link with email and password as query params
    const baseUrl = frontendUrl || 'http://16.171.22.184:5000';
    const updatePasswordUrl = `${baseUrl}/update-password?email=${encodeURIComponent(to)}&tempPassword=${encodeURIComponent(password)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to Our Platform!</h2>
        <p style="color: #666; line-height: 1.6;">Your account has been successfully created. Here are your login credentials:</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 5px 0;"><strong>Username:</strong> ${safeUsername}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${safePassword}</p>
          <p style="margin: 5px 0;"><strong>Role:</strong> ${safeRole}</p>
        </div>
        
        <div style="margin: 30px 0;">
          <p style="color: #666; line-height: 1.6;">
            <strong>Important:</strong> For security reasons, you must change your password before you can fully access your account.
          </p>
          <a href="${updatePasswordUrl}" 
             style="display: inline-block; background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">
            Update Your Password Now
          </a>
        </div>
        
        <p style="color: #666; line-height: 1.6; margin-top: 20px; font-size: 14px;">
          Or copy and paste this link in your browser:<br/>
          <a href="${updatePasswordUrl}" style="color: #4CAF50; word-break: break-all;">${updatePasswordUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
          If you did not create this account, please contact support immediately.
        </p>
      </div>
    `;

    const text = `Welcome! Your account has been created.\n\nEmail: ${to}\nUsername: ${username}\nTemporary Password: ${password}\nRole: ${role}\n\nIMPORTANT: You must update your password before you can fully access your account.\n\nUpdate your password here: ${updatePasswordUrl}\n\nIf you did not create this account, please contact support immediately.`;

    return this.sendEmail(to, subject, html, text);
  }
}
