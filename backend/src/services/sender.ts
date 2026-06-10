import axios from 'axios';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const CHANNEL_STUB_URL = process.env.CHANNEL_STUB_URL || 'http://localhost:5001';

export async function sendToChannel(messageId: string, recipientPhone: string, text: string, channel: string) {
  try {
    const response = await axios.post(`${CHANNEL_STUB_URL}/send`, {
      messageId,
      recipientPhone,
      text,
      channel
    });

    if (response.status === 200 || response.status === 201 || response.status === 202) {
      console.log(`[Sender] Message ${messageId} successfully accepted by channel stub.`);
    } else {
      throw new Error(`Invalid response status: ${response.status}`);
    }
  } catch (error: any) {
    console.error(`[Sender] Failed to send message ${messageId} to channel stub:`, error.message);
    
    // If it fails to connect or send, we update status to FAILED
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const msg = await tx.message.findUnique({
        where: { id: messageId },
        select: { status: true, campaignId: true }
      });

      if (msg && msg.status !== 'FAILED') {
        await tx.message.update({
          where: { id: messageId },
          data: { status: 'FAILED' }
        });

        await tx.receipt.create({
          data: {
            messageId,
            event: 'FAILED'
          }
        });

        await tx.campaign.update({
          where: { id: msg.campaignId },
          data: {
            totalFailed: { increment: 1 }
          }
        });
      }
    });
  }
}
