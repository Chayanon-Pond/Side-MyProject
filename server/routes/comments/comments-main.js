import express from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { 
  getCommentsByArticle, 
  createComment, 
  updateComment, 
  deleteComment 
} from './commentHandlers.js';

const commentsRouter = express.Router();

// GET routes (public)
commentsRouter.get('/article/:articleId', getCommentsByArticle);

// POST routes (protected)
commentsRouter.post('/article/:articleId', authenticateToken, createComment);

// PUT routes (protected)
commentsRouter.put('/:commentId', authenticateToken, updateComment);

// DELETE routes (protected)
commentsRouter.delete('/:commentId', authenticateToken, deleteComment);

export default commentsRouter;
