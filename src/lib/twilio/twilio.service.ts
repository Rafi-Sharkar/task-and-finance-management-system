import { ENVEnum } from '@/common/enum/env.enum';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>(
      ENVEnum.TWILIO_ACCOUNT_SID,
    );
    const authToken = this.configService.get<string>(ENVEnum.TWILIO_AUTH_TOKEN);
    this.fromNumber =
      this.configService.get<string>(ENVEnum.TWILIO_PHONE_NUMBER) || '';

    if (accountSid && authToken) {
      this.client = twilio.default(accountSid, authToken);
      this.logger.log('Twilio service initialized');
    } else {
      this.logger.warn(
        'Twilio credentials not found. SMS functionality will be disabled.',
      );
    }
  }

  async sendSMS(to: string, message: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Twilio not configured. Skipping SMS send.');
      return;
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to,
      });

      this.logger.log(
        `SMS sent successfully to ${to}. Message SID: ${result.sid}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}:`, error);
      throw error;
    }
  }
}
