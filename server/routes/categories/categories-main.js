import express from 'express';
import pool from '../../db/pool.js';
import { authenticateToken, requireRole } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { validate, z, numericString, emptyToUndefined } from '../../lib/validate.js';
import { slugify } from '../../lib/slug.js';

const router = express.Router();

const idParams = z.object({ id: numericString('id') });
const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: emptyToUndefined(z.string().max(2000).optional()),
});
const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
});

async function assertSlugFree(slug, exceptId = null) {
  const r = exceptId
    ? await pool.query('SELECT id FROM categories WHERE slug = $1 AND id <> $2', [slug, exceptId])
    : await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
  if (r.rows.length > 0) throw AppError.badRequest('A category with this name already exists', 'CATEGORY_EXISTS');
}

// GET /api/categories -> bare array
router.get('/', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT id, name, slug, description FROM categories ORDER BY name ASC');
  res.json(result.rows);
}));

// POST /api/categories (admin)
router.post('/', authenticateToken, requireRole('admin'), validate({ body: createSchema }), asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const slug = slugify(name);
  if (!slug) throw AppError.badRequest('Category name must contain letters or numbers', 'INVALID_NAME');
  await assertSlugFree(slug);
  const result = await pool.query(
    'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) RETURNING id, name, slug, description, created_at, updated_at',
    [name, slug, description ?? null],
  );
  res.status(201).json(result.rows[0]);
}));

// PUT /api/categories/:id (admin)
router.put('/:id', authenticateToken, requireRole('admin'), validate({ params: idParams, body: updateSchema }), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const existing = await pool.query('SELECT id FROM categories WHERE id = $1', [id]);
  if (existing.rows.length === 0) throw AppError.notFound('Category not found');

  const sets = [];
  const values = [];
  if (name !== undefined) {
    const slug = slugify(name);
    if (!slug) throw AppError.badRequest('Category name must contain letters or numbers', 'INVALID_NAME');
    await assertSlugFree(slug, id);
    values.push(name, slug);
    sets.push(`name = $${values.length - 1}`, `slug = $${values.length}`);
  }
  if (description !== undefined) {
    values.push(description || null);
    sets.push(`description = $${values.length}`);
  }
  if (sets.length === 0) throw AppError.badRequest('Nothing to update', 'EMPTY_UPDATE');
  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  const result = await pool.query(
    `UPDATE categories SET ${sets.join(', ')} WHERE id = $${values.length}
     RETURNING id, name, slug, description, created_at, updated_at`,
    values,
  );
  res.json(result.rows[0]);
}));

// DELETE /api/categories/:id (admin) -> 409 when articles still use it
router.delete('/:id', authenticateToken, requireRole('admin'), validate({ params: idParams }), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const used = await pool.query('SELECT COUNT(*) AS n FROM articles WHERE category_id = $1', [id]);
  const n = parseInt(used.rows[0].n, 10);
  if (n > 0) {
    throw AppError.conflict(`Category is used by ${n} article(s); reassign or delete them first`, 'CATEGORY_IN_USE');
  }
  const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw AppError.notFound('Category not found');
  res.json({ message: 'Category deleted successfully', deletedId: result.rows[0].id });
}));

export default router;
