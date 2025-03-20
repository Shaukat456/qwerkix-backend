import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authenticate } from '../middleware/authenticate';
import { validateRequest } from '../middleware/validateRequest';
import { projectSchema } from '../validators/projectValidator';

const router = Router();

router.use(authenticate);

router
  .route('/')
  .get(projectController.getProjects)
  .post(validateRequest(projectSchema), projectController.createProject);

router
  .route('/:id')
  .get(projectController.getProjectById)
  .put(validateRequest(projectSchema), projectController.updateProject)
  .delete(projectController.deleteProject);

export { router as projectRoutes };