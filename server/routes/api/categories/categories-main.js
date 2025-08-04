import express from 'express';
import { authenticateToken } from '../../../middleware/auth.js';
import { getCategories, getCategoryById } from './getCategories.js';
import { createCategory } from './createCategory.js';
import { updateCategory } from './updateCategory.js';
import { deleteCategory } from './deleteCategory.js';

const categoriesRouter = express.Router();

// Public routes
categoriesRouter.get('/', getCategories);
categoriesRouter.get('/:id', getCategoryById);

// Protected routes
categoriesRouter.post('/', authenticateToken, createCategory);
categoriesRouter.put('/:id', authenticateToken, updateCategory);
categoriesRouter.delete('/:id', authenticateToken, deleteCategory);

export default categoriesRouter;