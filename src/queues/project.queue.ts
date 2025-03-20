import Queue from 'bull';
import { logger } from '../utils/logger';
import { EmailService } from '../services/email.service';
import { prisma } from '../config/database';

export class ProjectQueue {
  private queue: Queue.Queue;
  private emailService: EmailService;

  constructor() {
    this.queue = new Queue('project-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.emailService = new EmailService();
    this.processJobs();
  }

  async add(jobName: string, data: any): Promise<void> {
    try {
      await this.queue.add(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      });
    } catch (error) {
      logger.error('Error adding job to queue:', error);
    }
  }

  private processJobs(): void {
    this.queue.process('projectSetup', async (job) => {
      const { projectId, ownerId } = job.data;

      try {
        // Get project and owner details
        const [project, owner] = await Promise.all([
          prisma.project.findUnique({ where: { id: projectId } }),
          prisma.user.findUnique({ where: { id: ownerId } }),
        ]);

        if (!project || !owner) {
          throw new Error('Project or owner not found');
        }

        // Create default tasks
        await prisma.task.createMany({
          data: [
            {
              title: 'Project Setup',
              description: 'Initial project setup and configuration',
              status: 'PENDING',
              priority: 'HIGH',
              projectId,
              assigneeId: ownerId,
            },
            {
              title: 'Project Planning',
              description: 'Create project timeline and milestones',
              status: 'PENDING',
              priority: 'HIGH',
              projectId,
              assigneeId: ownerId,
            },
          ],
        });

        // Send welcome email
        await this.emailService.sendProjectWelcome(owner.email, {
          projectName: project.name,
          ownerName: owner.name,
        });

        logger.info(`Project setup completed for project: ${projectId}`);
      } catch (error) {
        logger.error('Error in project setup job:', error);
        throw error;
      }
    });

    // Handle failed jobs
    this.queue.on('failed', (job, error) => {
      logger.error('Job failed:', {
        jobId: job.id,
        jobName: job.name,
        error: error.message,
      });
    });
  }
}