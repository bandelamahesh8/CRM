import { Router } from 'express';
import { previewSegment } from '../services/segmenter';

const router = Router();

router.get('/preview', async (req, res) => {
  try {
    const filters: any = {};
    
    if (req.query.min_orders !== undefined && req.query.min_orders !== '') {
      filters.min_orders = parseInt(req.query.min_orders as string);
    }
    if (req.query.max_orders !== undefined && req.query.max_orders !== '') {
      filters.max_orders = parseInt(req.query.max_orders as string);
    }
    if (req.query.inactive_days !== undefined && req.query.inactive_days !== '') {
      filters.inactive_days = parseInt(req.query.inactive_days as string);
    }
    if (req.query.min_spent !== undefined && req.query.min_spent !== '') {
      filters.min_spent = parseFloat(req.query.min_spent as string);
    }
    if (req.query.max_spent !== undefined && req.query.max_spent !== '') {
      filters.max_spent = parseFloat(req.query.max_spent as string);
    }
    if (req.query.city !== undefined && req.query.city !== '') {
      filters.city = req.query.city as string;
    }
    if (req.query.product_category !== undefined && req.query.product_category !== '') {
      filters.product_category = req.query.product_category as string;
    }

    const result = await previewSegment(filters);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in segment preview route:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
