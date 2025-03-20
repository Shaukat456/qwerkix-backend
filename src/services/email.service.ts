import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendProjectWelcome(
    to: string,
    data: { projectName: string; ownerName: string }
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `Welcome to your new project: ${data.projectName}`,
        html: `
          <h1>Welcome to ${data.projectName}</h1>
          <p>Dear ${data.ownerName},</p>
          <p>Your project has been successfully created. Here are some next steps:</p>
          <ul>
            <li>Complete the project setup task</li>
            <li>Create your project timeline</li>
            <li>Invite team members</li>
          </ul>
          <p>Best regards,<br>Your Project Management Team</p>
        `,
      });
    } catch (error) {
      logger.error('Error sending welcome email:', error);
    }
  }

  async sendTaskAssignment(
    to: string,
    data: { taskTitle: string; projectName: string; assigneeName: string }
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: `New Task Assignment: ${data.taskTitle}`,
        html: `
          <h1>New Task Assignment</h1>
          <p>Dear ${data.assigneeName},</p>
          <p>You have been assigned a new task in project ${data.projectName}:</p>
          <h2>${data.taskTitle}</h2>
          <p>Please log in to your dashboard to view the task details.</p>
          <p>Best regards,<br>Your Project Management Team</p>
        `,
      });
    } catch (error) {
      logger.error('Error sending task assignment email:', error);
    }
  }
}