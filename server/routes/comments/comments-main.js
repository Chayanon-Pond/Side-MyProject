import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { asyncHandler } from '../../lib/errors.js';
import { validate, z, numericString, paginationQuery } from '../../lib/validate.js';
import { getCommentsByArticle, createComment, updateComment, deleteComment } from './commentHandlers.js';

const router = express.Router();

const articleParams = z.object({ articleId: numericString('articleId') });
const commentParams = z.object({ commentId: numericString('commentId') });
const content = z.string().trim().min(1, 'Comment content is required').max(2000, 'Comment is too long (max 2000 characters)');
const listQuery = z.object({ ...paginationQuery, limit: paginationQuery.limit.default(20) });
const createBody = z.object({
  content,
  parent_id: z.preprocess((v) => (v === '' ? null : v), z.coerce.number().int().positive().max(2147483647).nullable().optional()),
});
const updateBody = z.object({ content });

router.get('/article/:articleId', validate({ params: articleParams, query: listQuery }), asyncHandler(getCommentsByArticle));
// Rate limit for this route is mounted in app.js (20/min/IP).
router.post('/article/:articleId', authenticateToken, validate({ params: articleParams, body: createBody }), asyncHandler(createComment));
router.put('/:commentId', authenticateToken, validate({ params: commentParams, body: updateBody }), asyncHandler(updateComment));
router.delete('/:commentId', authenticateToken, validate({ params: commentParams }), asyncHandler(deleteComment));

export default router;
