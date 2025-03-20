import { Request, Response } from 'express';
import { ProjectService } from '../services/projectService';
import { validateProject } from '../validators/projectValidator';
import { AppError } from '../utils/appError';
import asyncHandler from 'express-async-handler';

const projectService = new ProjectService();

export const projectController = {
  createProject: asyncHandler(async (req: Request, res: Response) => {
    const validatedData = validateProject(req.body);
    const project = await projectService.createProject(validatedData);
    res.status(201).json(project);
  }),

  getProjects: asyncHandler(async (req: Request, res: Response) => {
    const ownerId = req.user?.id;
    if (!ownerId) throw new AppError('User not authenticated', 401);
    
    const projects = await projectService.getProjects(ownerId);
    res.json(projects);
  }),

  getProjectById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const project = await projectService.getProjectById(id);
    res.json(project);
  }),

  updateProject: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const validatedData = validateProject(req.body);
    const project = await projectService.updateProject(id, validatedData);
    res.json(project);
  }),

  deleteProject: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await projectService.deleteProject(id);
    res.status(204).send();
  }),
};