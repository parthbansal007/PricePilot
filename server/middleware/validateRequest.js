import { ZodError } from 'zod';

/**
 * Express middleware to validate request body, query parameters, and route params using Zod schemas
 */
export const validateRequest = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError || error?.name === 'ZodError') {
        const issues = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        return res.status(400).json({
          message: 'Validation failed',
          errors: issues
        });
      }
      next(error);
    }
  };
};
