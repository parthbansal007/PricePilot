import { ZodError } from 'zod';

/**
 * Express middleware to validate request body, query parameters, and route params using Zod schemas
 */
export const validateRequest = (schemas = {}) => {
  return async (req, res, next) => {
    try {
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        Object.assign(req.params, parsedParams);
      }
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        for (const key of Object.keys(req.query)) {
          if (!(key in parsedQuery)) delete req.query[key];
        }
        Object.assign(req.query, parsedQuery);
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
