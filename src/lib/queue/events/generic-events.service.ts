import { QueueEventsEnum } from '@/common/enum/queue-events.enum';
import { QueueName } from '@/common/enum/queue-name.enum';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Queue } from 'bullmq';

import { GenericPayload } from '../interface/generic.payload';
import { enqueueJobHelper } from '../utils/queue.utils';

@Injectable()
export class GenericEventsService {
  private readonly logger = new Logger(GenericEventsService.name);

  constructor(
    @InjectQueue(QueueName.GENERIC)
    private readonly genericQueue: Queue,
    @InjectQueue(QueueName.MAIL)
    private readonly mailQueue: Queue,
  ) {}

  @OnEvent(QueueEventsEnum.GENERIC)
  async handleGenericEvent(payload: GenericPayload) {
    await enqueueJobHelper(
      this.genericQueue,
      QueueEventsEnum.GENERIC,
      payload,
      payload.adminId,
      this.logger,
    );
  }

  @OnEvent(QueueEventsEnum.REGISTRATION_MAIL)
  async handleRegistrationMail(payload: {
    email: string;
    username: string;
    password: string;
    role: string;
  }) {
    await enqueueJobHelper(
      this.mailQueue,
      QueueEventsEnum.REGISTRATION_MAIL,
      payload,
      payload.email,
      this.logger,
    );
  }

  @OnEvent(QueueEventsEnum.FORGOT_PASSWORD_OTP)
  async handleForgotPasswordOtp(payload: {
    email: string;
    otp: string;
    fullName: string;
  }) {
    await enqueueJobHelper(
      this.mailQueue,
      QueueEventsEnum.FORGOT_PASSWORD_OTP,
      payload,
      payload.email,
      this.logger,
    );
  }

  @OnEvent(QueueEventsEnum.TWO_FACTOR_OTP)
  async handleTwoFactorOtp(payload: {
    userId: string;
    phone: string;
    otp: string;
    fullName: string;
  }) {
    await enqueueJobHelper(
      this.mailQueue,
      QueueEventsEnum.TWO_FACTOR_OTP,
      payload,
      payload.phone,
      this.logger,
    );
  }
}
