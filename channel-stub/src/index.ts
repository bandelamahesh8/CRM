import express from 'express';
import dotenv from 'dotenv';
import { simulateLifecycle } from './simulator';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Endpoint to simulate sending a message
app.post('/send', (req, res) => {
  const { messageId, recipientPhone, text, channel } = req.body;

  if (!messageId || !recipientPhone || !text || !channel) {
    console.error('[Channel Stub] Missing parameters in /send request:', req.body);
    return res.status(400).json({ error: 'messageId, recipientPhone, text, and channel are required' });
  }

  console.log(`[Channel Stub] Received message send request: MessageID=${messageId}, Phone=${recipientPhone}, Channel=${channel}`);
  
  // Trigger lifecycle simulation asynchronously
  simulateLifecycle({ messageId, recipientPhone, text, channel });

  // Respond immediately with 202 Accepted
  return res.status(202).json({ accepted: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'channel-stub' });
});

app.listen(PORT, () => {
  console.log(`[Channel Stub] Simulator service running on port ${PORT}`);
});
