import { Router } from 'express';
import { analyzeIntent } from '../services/gemini';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiResult = await analyzeIntent(message, history || []);
    
    if (aiResult.intent === 'create_campaign') {
      return res.json({
        reply: aiResult.reply,
        action: {
          type: 'preview_segment',
          data: {
            campaign_name: aiResult.campaign_name,
            filters: aiResult.segment.filters,
            description: aiResult.segment.description,
            suggested_message: aiResult.suggested_message,
            channel: aiResult.channel
          }
        }
      });
    }

    return res.json({
      reply: aiResult.reply,
      action: null
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
