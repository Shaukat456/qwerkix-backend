import { Request, Response } from 'express';
import { ProjectModel } from '../models/project.model';
import { validateProject } from '../validators/project.validator';
import { AppError } from '../utils/appError';
import asyncHandler from 'express-async-handler';
import { Cache } from '../services/cache.service';
import { RateLimiter } from '../services/rateLimiter.service';

export class ProjectController {
  private model: ProjectModel;
  private cache: Cache;
  private rateLimiter: RateLimiter;

  constructor() {
    this.model = new ProjectModel();
    this.cache = new Cache();
    this.rateLimiter = new RateLimiter();

    // Setup event listeners
    this.model.on('project:created', this.handleProjectCreated.bind(this));
    this.model.on('project:updated', this.handleProjectUpdated.bind(this));
    this.model.on('project:deleted', this.handleProjectDeleted.bind(this));
  }

  private async handleProjectCreated(project: any): Promise<void> {
    // Handle project creation events
    console.log('Project created:', project.id);
  }

  private async handleProjectUpdated(project: any): Promise<void> {
    // Handle project update events
    console.log('Project updated:', project.id);
  }

  private async handleProjectDeleted(project: any): Promise<void> {
    // Handle project deletion events
    console.log('Project deleted:', project.id);
  }

  createProject = asyncHandler(async (req: Request, res: Response) => {
    // Rate limiting
    await this.rateLimiter.checkLimit(req);

    const validatedData = validateProject(req.body);
    const project = await this.model.create({
      ...validatedData,
      ownerId: req.user!.id,
    });

    res.status(201).json({
      status: 'success',
      data: project,
    });
  });

  getProjects = asyncHandler(async (req: Request, res: Response) => {
    const projects = await this.model.findByOwner(req.user!.id);

    res.json({
      status: 'success',
      data: projects,
    });
  });

  getProjectById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await this.model.findById(id);

    if (!project) {
      throw new AppError('Project not found', 404);
    }

    // Check ownership
    if (project.ownerId !== req.user!.id) {
      throw new AppError('Not authorized to access this project', 403);
    }

    res.json({
      status: 'success',
      data: project,
    });
  });

  updateProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = validateProject(req.body);

    // Check ownership
    const existingProject = await this.model.findById(id);
    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    if (existingProject.ownerId !== req.user!.id) {
      throw new AppError('Not authorized to update this project', 403);
    }

    const project = await this.model.update(id, validatedData);

    res.json({
      status: 'success',
      data: project,
    });
  });

  deleteProject = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const existingProject = await this.model.findById(id);
    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    if (existingProject.ownerId !== req.user!.id) {
      throw new AppError('Not authorized to delete this project', 403);
    }

    await this.model.delete(id);

    res.status(204).send();
  });

  getProjectMetrics = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const existingProject = await this.model.findById(id);
    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    if (existingProject.ownerId !== req.user!.id) {
      throw new AppError('Not authorized to access this project', 403);
    }

    const metrics = await this.model.getProjectMetrics(id);

    res.json({
      status: 'success',
      data: metrics,
    });
  });

  getProjectTimeline = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check ownership
    const existingProject = await this.model.findById(id);
    if (!existingProject) {
      throw new AppError('Project not found', 404);
    }

    if (existingProject.ownerId !== req.user!.id) {
      throw new AppError('Not authorized to access this project', 403);
    }

    const timeline = await this.model.getProjectTimeline(id);

    res.json({
      status: 'success',
      data: timeline,
    });
  });
}