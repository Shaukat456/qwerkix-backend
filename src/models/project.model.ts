import { Project, ProjectStatus, Task } from '@prisma/client';
import { EventEmitter } from 'events';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { Cache } from '../services/cache.service';
import { ProjectQueue } from '../queues/project.queue';

export class ProjectModel extends EventEmitter {
  private cache: Cache;
  private queue: ProjectQueue;

  constructor() {
    super();
    this.cache = new Cache();
    this.queue = new ProjectQueue();
  }

  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
  }): Promise<Project> {
    const project = await prisma.project.create({
      data: {
        ...data,
        status: ProjectStatus.ACTIVE,
      },
    });

    // Emit event for audit logging
    this.emit('project:created', project);

    // Add to cache
    await this.cache.set(`project:${project.id}`, project);

    // Queue project setup tasks
    await this.queue.add('projectSetup', {
      projectId: project.id,
      ownerId: project.ownerId,
    });

    return project;
  }

  async findById(id: string): Promise<Project | null> {
    // Try cache first
    const cached = await this.cache.get(`project:${id}`);
    if (cached) return cached as Project;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: true,
        owner: true,
      },
    });

    if (project) {
      await this.cache.set(`project:${id}`, project);
    }

    return project;
  }

  async findByOwner(ownerId: string): Promise<Project[]> {
    return prisma.project.findMany({
      where: { ownerId },
      include: {
        tasks: true,
        owner: true,
      },
    });
  }

  async update(id: string, data: Partial<Project>): Promise<Project> {
    const project = await prisma.project.update({
      where: { id },
      data,
      include: {
        tasks: true,
        owner: true,
      },
    });

    // Invalidate cache
    await this.cache.del(`project:${id}`);

    // Emit event for audit logging
    this.emit('project:updated', project);

    return project;
  }

  async delete(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete all tasks first
      await tx.task.deleteMany({
        where: { projectId: id },
      });

      // Delete the project
      await tx.project.delete({
        where: { id },
      });
    });

    // Invalidate cache
    await this.cache.del(`project:${id}`);

    // Emit event for audit logging
    this.emit('project:deleted', { id });
  }

  async getProjectMetrics(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    progressPercentage: number;
  }> {
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === 'COMPLETED'
    ).length;
    const pendingTasks = totalTasks - completedTasks;
    const progressPercentage = totalTasks === 0 
      ? 0 
      : (completedTasks / totalTasks) * 100;

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      progressPercentage,
    };
  }

  async archiveInactiveProjects(daysInactive: number): Promise<number> {
    const date = new Date();
    date.setDate(date.getDate() - daysInactive);

    const result = await prisma.project.updateMany({
      where: {
        updatedAt: {
          lt: date,
        },
        status: ProjectStatus.ACTIVE,
      },
      data: {
        status: ProjectStatus.ARCHIVED,
      },
    });

    return result.count;
  }

  async getProjectTimeline(id: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
    });
  }
}