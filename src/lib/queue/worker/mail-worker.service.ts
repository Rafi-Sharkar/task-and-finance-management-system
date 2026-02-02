import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { AuthMailService } from '@/lib/mail/services/auth-mail.service';
import { TwilioService } from '@/lib/twilio/twilio.service';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

type MailJobPayload =
  | {
      name: QueueEventsEnum.REGISTRATION_MAIL;
      data: {
        email: string;
        username: string;
        password: string;
        role: string;
      };
    }
  | {
      name: QueueEventsEnum.FORGOT_PASSWORD_OTP;
      data: {
        email: string;
        otp: string;
        fullName: string;
      };
    }
  | {
      name: QueueEventsEnum.TWO_FACTOR_OTP;
      data: {
        userId: string;
        phone: string;
        otp: string;
        fullName: string;
      };
    };

@Processor(QueueName.MAIL, { concurrency: 5 })
export class MailWorkerService extends WorkerHost {
  private readonly logger = new Logger(MailWorkerService.name);

  constructor(
    private readonly authMailService: AuthMailService,
    private readonly configService: ConfigService,
    private readonly twilioService: TwilioService,
  ) {
    super();
  }

  async process(job: Job<MailJobPayload>): Promise<void> {
    this.logger.log(`Processing mail job ${job.id} - ${job.name}`);

    try {
      switch (job.name) {
        case QueueEventsEnum.REGISTRATION_MAIL:
          await this.handleRegistrationMail(job.data as any);
          break;

        case QueueEventsEnum.FORGOT_PASSWORD_OTP:
          await this.handleForgotPasswordOtp(job.data as any);
          break;

        case QueueEventsEnum.TWO_FACTOR_OTP:
          await this.handleTwoFactorOtp(job.data as any);
          break;

        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
      }
    } catch (err) {
      this.logger.error(
        `Mail job ${job.id} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err; // allows retry/backoff
    }
  }

  private async handleRegistrationMail(data: {
    email: string;
    username: string;
    password: string;
    role: string;
  }) {
    this.logger.log(`Sending registration email to ${data.email}`);

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      'http://16.171.22.184:5000';

    await this.authMailService.sendRegistrationEmail(
      data.email,
      data.username,
      data.password,
      data.role,
      frontendUrl,
    );

    this.logger.log(`Registration email sent successfully to ${data.email}`);
  }

  private async handleForgotPasswordOtp(data: {
    email: string;
    otp: string;
    fullName: string;
  }) {
    this.logger.log(`Sending password reset OTP to ${data.email}`);

    await this.authMailService.sendResetPasswordCodeEmail(
      data.email,
      data.otp,
      {
        message: `Hi ${data.fullName}, we received a request to reset your password. Use the code below to reset it:`,
      },
    );

    this.logger.log(`Password reset OTP sent successfully to ${data.email}`);
  }

  private async handleTwoFactorOtp(data: {
    userId: string;
    phone: string;
    otp: string;
    fullName: string;
  }) {
    this.logger.log(`Sending two-factor OTP to ${data.phone}`);

    await this.twilioService.sendSMS(
      data.phone,
      `Your OTP for enabling Two-Factor Authentication is: ${data.otp}. Valid for 5 minutes.`,
    );

    this.logger.log(`Two-factor OTP sent successfully to ${data.phone}`);
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Mail job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: any) {
    this.logger.error(`Mail job ${job.id} failed: ${err?.message}`);
  }
}
