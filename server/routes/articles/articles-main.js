import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';

// Import handlers
import { getAllArticles, getArticleById, incrementViewCount } from './getArticles.js';
import { createArticle } from './createArticle.js';
import { updateArticle } from './updateArticle.js';
import { deleteArticle } from './deleteArticle.js';

const articlesRouter = express.Router();

// GET routes (public)
articlesRouter.get('/', getAllArticles );
articlesRouter.get('/:id', getArticleById);
articlesRouter.post('/:id/view', incrementViewCount);

// POST routes (protected)
articlesRouter.post('/', authenticateToken, createArticle);

// PUT routes (protected)
articlesRouter.put('/:id', authenticateToken, updateArticle);

// DELETE routes (protected)
articlesRouter.delete('/:id', authenticateToken, deleteArticle);

export default articlesRouter;