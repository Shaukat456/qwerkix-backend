import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

export const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.string().uuid(),
});

export const validateProject = (data: unknown) => {
  return projectSchema.parse(data);
};