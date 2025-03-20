import request from 'supertest';
import { Express } from 'express';
import { createServer } from '../../server';
import { prisma } from '../../config/database';
import { Cache } from '../../services/cache.service';

describe('Project API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = await createServer();
    // Create test user and get auth token
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
    });
    authToken = user.id; // In real app, this would be a JWT
  });

  afterAll(async () => {
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test Description',
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData);

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        name: projectData.name,
        description: projectData.description,
      });
    });

    it('should validate project data', async () => {
      const invalidData = {
        description: 'Missing name',
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('GET /api/projects', () => {
    it('should return user\'s projects', async () => {
      // Create test projects
      await prisma.project.createMany({
        data: [
          {
            name: 'Project 1',
            ownerId: authToken,
            status: 'ACTIVE',
          },
          {
            name: 'Project 2',
            ownerId: authToken,
            status: 'ACTIVE',
          },
        ],
      });

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/projects');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: authToken,
          status: 'ACTIVE',
        },
      });
    });

    it('should return project by id', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(testProject.id);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: authToken,
          status: 'ACTIVE',
        },
      });
    });

    it('should update project', async () => {
      const updateData = {
        name: 'Updated Project',
        description: 'Updated Description',
      };

      const response = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject(updateData);
    });

    it('should validate update data', async () => {
      const invalidData = {
        name: '', // Empty name should be invalid
      };

      const response = await request(app)
        .put(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          name: 'Test Project',
          ownerId: authToken,
          status: 'ACTIVE',
        },
      });
    });

    it('should delete project', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);

      // Verify project is deleted
      const deletedProject = await prisma.project.findUnique({
        where: { id: testProject.id },
      });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});