import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { messageId, event, timestamp } = req.body;
    if (!messageId || !event) {
      return res.status(400).json({ error: 'messageId and event are required' });
    }

    const eventUpper = event.toUpperCase(); // DELIVERED, FAILED, OPENED, CLICKED

    // 1. Idempotency Check: check if this exact receipt event already exists for the message
    const existingReceipt = await prisma.receipt.findFirst({
      where: {
        messageId,
        event: eventUpper
      }
    });

    if (existingReceipt) {
      console.log(`[Receipts] Duplicate receipt ignored: Message ${messageId}, Event ${eventUpper}`);
      return res.json({ ok: true, message: 'Duplicate receipt ignored' });
    }

    // 2. Process receipt event and update tables inside a database transaction
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find the message
      const message = await tx.message.findUnique({
        where: { id: messageId },
        select: { id: true, campaignId: true, status: true }
      });

      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // Create raw receipt log
      await tx.receipt.create({
        data: {
          messageId,
          event: eventUpper,
          receivedAt: timestamp ? new Date(timestamp) : new Date()
        }
      });

      // Update message status
      // We only update status if it progresses the funnel (e.g. click over open)
      const statusPriority: Record<string, number> = {
        'PENDING': 0,
        'SENT': 1,
        'DELIVERED': 2,
        'FAILED': 2,
        'OPENED': 3,
        'CLICKED': 4
      };

      const currentPriority = statusPriority[message.status] || 0;
      const newPriority = statusPriority[eventUpper] || 0;

      if (newPriority > currentPriority || eventUpper === 'FAILED') {
        await tx.message.update({
          where: { id: messageId },
          data: {
            status: eventUpper,
            sentAt: eventUpper === 'DELIVERED' || eventUpper === 'FAILED' ? new Date() : undefined
          }
        });
      }

      // Increment campaign counters
      const updateData: any = {};
      if (eventUpper === 'DELIVERED') {
        updateData.totalDelivered = { increment: 1 };
      } else if (eventUpper === 'FAILED') {
        updateData.totalFailed = { increment: 1 };
      } else if (eventUpper === 'OPENED') {
        updateData.totalOpened = { increment: 1 };
      } else if (eventUpper === 'CLICKED') {
        updateData.totalClicked = { increment: 1 };
      }

      await tx.campaign.update({
        where: { id: message.campaignId },
        data: updateData
      });

      // Check if all messages in the campaign are resolved
      const unresolvedCount = await tx.message.count({
        where: {
          campaignId: message.campaignId,
          status: {
            in: ['PENDING', 'SENT']
          }
        }
      });

      if (unresolvedCount === 0) {
        await tx.campaign.update({
          where: { id: message.campaignId },
          data: { status: 'COMPLETED' }
        });
        console.log(`[Receipts] Campaign ${message.campaignId} marked as COMPLETED.`);
      }
    });

    return res.json({ ok: true });
  } catch (error: any) {
    console.error('Error handling receipt:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
