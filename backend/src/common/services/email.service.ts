import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP Mail Transporter initialized with host: ${host}`);
    } else {
      this.logger.warn(
        'SMTP settings are incomplete in environment variables. Email Service running in MOCK mode (logging to console).'
      );
    }
  }

  async sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
    const from = process.env.SMTP_FROM || 'no-reply@yourdomain.com';

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from,
          to,
          subject,
          text,
          html,
        });
        this.logger.log(`Email successfully sent to ${to} with subject: "${subject}"`);
        return true;
      } catch (error) {
        this.logger.error(`Failed to send email to ${to}:`, error);
        return false;
      }
    } else {
      // Mock mode logging
      console.log('\n==================================================');
      console.log('MOCK EMAIL SENT (Check below link to verify)');
      console.log(`To: ${to}`);
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Text:\n${text}`);
      console.log('==================================================\n');
      return true;
    }
  }
}
