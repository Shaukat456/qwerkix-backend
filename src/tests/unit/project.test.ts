import { ProjectModel } from '../../models/project.model';
import { ProjectService } from '../../services/project.service';
import { Cache } from '../../services/cache.service';
import { prisma } from '../../config/database';

// Mock dependencies
jest.mock('../../config/database', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../services/cache.service');

describe('ProjectModel', () => {
  let projectModel: ProjectModel;
  let mockCache: jest.Mocked<Cache>;

  beforeEach(() => {
    mockCache = new Cache() as jest.Mocked<Cache>;
    projectModel = new ProjectModel();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
      };

      const expectedProject = {
        id: 'project-123',
        ...projectData,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.project.create as jest.Mock).mockResolvedValue(expectedProject);

      const result = await projectModel.create(projectData);

      expect(result).toEqual(expectedProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining(projectData),
      });
    });

    it('should emit project:created event after creation', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
        ownerId: 'user-123',
      };

      const createdProject = {
        id: 'project-123',
        ...projectData,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.project.create as jest.Mock).mockResolvedValue(createdProject);

      const eventSpy = jest.spyOn(projectModel, 'emit');

      await projectModel.create(projectData);

      expect(eventSpy).toHaveBeenCalledWith('project:created', createdProject);
    });
  });

  describe('findById', () => {
    it('should return cached project if available', async () => {
      const projectId = 'project-123';
      const cachedProject = {
        id: projectId,
        name: 'Cached Project',
      };

      mockCache.get.mockResolvedValue(cachedProject);

      const result = await projectModel.findById(projectId);

      expect(result).toEqual(cachedProject);
      expect(mockCache.get).toHaveBeenCalledWith(`project:${projectId}`);
      expect(prisma.project.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not in cache', async () => {
      const projectId = 'project-123';
      const dbProject = {
        id: projectId,
        name: 'DB Project',
      };

      mockCache.get.mockResolvedValue(null);
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(dbProject);

      const result = await projectModel.findById(projectId);

      expect(result).toEqual(dbProject);
      expect(mockCache.get).toHaveBeenCalledWith(`project:${projectId}`);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: projectId },
        include: { tasks: true, owner: true },
      });
      expect(mockCache.set).toHaveBeenCalledWith(`project:${projectId}`, dbProject);
    });
  });

  describe('update', () => {
    it('should update project and invalidate cache', async () => {
      const projectId = 'project-123';
      const updateData = {
        name: 'Updated Project',
      };

      const updatedProject = {
        id: projectId,
        ...updateData,
        status: 'ACTIVE',
        updatedAt: new Date(),
      };

      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await projectModel.update(projectId, updateData);

      expect(result).toEqual(updatedProject);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: updateData,
        include: { tasks: true, owner: true },
      });
      expect(mockCache.del).toHaveBeenCalledWith(`project:${projectId}`);
    });

    it('should emit project:updated event after update', async () => {
      const projectId = 'project-123';
      const updateData = {
        name: 'Updated Project',
      };

      const updatedProject = {
        id: projectId,
        ...updateData,
        status: 'ACTIVE',
        updatedAt: new Date(),
      };

      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const eventSpy = jest.spyOn(projectModel, 'emit');

      await projectModel.update(projectId, updateData);

      expect(eventSpy).toHaveBeenCalledWith('project:updated', updatedProject);
    });
  });

  describe('delete', () => {
    it('should delete project and clear cache', async () => {
      const projectId = 'project-123';

      await projectModel.delete(projectId);

      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
      expect(mockCache.del).toHaveBeenCalledWith(`project:${projectId}`);
    });

    it('should emit project:deleted event after deletion', async () => {
      const projectId = 'project-123';

      const eventSpy = jest.spyOn(projectModel, 'emit');

      await projectModel.delete(projectId);

      expect(eventSpy).toHaveBeenCalledWith('project:deleted', { id: projectId });
    });
  });
});