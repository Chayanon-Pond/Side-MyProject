import { z } from 'zod';

/**
 * Express middleware: parse req.params / req.query / req.body with zod schemas.
 * Parsed values replace the originals (req.query is redefined because it is a getter in Express 5).
 * ZodErrors are forwarded to the central error handler -> 400.
 */
export function validate(schemas) {
  return (req, res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ---- shared primitives ----
export const idParam = z.coerce
  .number()
  .int()
  .positive();

export const numericString = (field = 'id') =>
  z.string().regex(/^\d+$/, `${field} must be numeric`).transform((v) => parseInt(v, 10)).pipe(z.number().int().positive().max(2147483647));

/** Accepts either a numeric id or a slug. */
export const idOrSlug = z
  .string()
  .min(1)
  .max(255)
  .regex(/^(\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/i, 'must be a numeric id or a slug');

export const paginationQuery = {
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
};

/** For multipart/JSON bodies where empty strings mean "not provided". */
export const emptyToUndefined = (schema) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), schema);

export { z };
