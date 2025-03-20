import { Project, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export class ProjectService {
  async createProject(data: Prisma.ProjectCreateInput): Promise<Project> {
    try {
      const project = await prisma.project.create({
        data,
        include: {
          owner: true,
          tasks: true,
        },
      });
      logger.info(`Project created: ${project.id}`);
      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw new AppError('Failed to create project', 500);
    }
  }

  async getProjects(ownerId: string): Promise<Project[]> {
    try {
      return await prisma.project.findMany({
        where: { ownerId },
        include: {
          tasks: true,
          owner: true,
        },
      });
    } catch (error) {
      logger.error('Error fetching projects:', error);
      throw new AppError('Failed to fetch projects', 500);
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    try {
      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          tasks: true,
          owner: true,
        },
      });

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      return project;
    } catch (error) {
      logger.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  }

  async updateProject(
    id: string,
    data: Prisma.ProjectUpdateInput
  ): Promise<Project> {
    try {
      return await prisma.project.update({
        where: { id },
        data,
        include: {
          tasks: true,
          owner: true,
        },
      });
    } catch (error) {
      logger.error(`Error updating project ${id}:`, error);
      throw new AppError('Failed to update project', 500);
    }
  }

  async deleteProject(id: string): Promise<void> {
    try {
      await prisma.project.delete({
        where: { id },
      });
      logger.info(`Project deleted: ${id}`);
    } catch (error) {
      logger.error(`Error deleting project ${id}:`, error);
      throw new AppError('Failed to delete project', 500);
    }
  }
}