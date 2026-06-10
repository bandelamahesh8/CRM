import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { buildPrismaQuery } from '../services/segmenter';
import { personalizeMessage } from '../services/personalizer';
import { sendToChannel } from '../services/sender';
import { summarizeCampaign } from '../services/gemini';

const router = Router();

// GET all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(campaigns);
  } catch (error: any) {
    console.error('Error fetching campaigns:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET campaign by ID (including details and AI performance summary)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        messages: {
          take: 50, // Limit message log list for efficiency
          orderBy: { updatedAt: 'desc' },
          include: {
            customer: {
              select: { name: true, phone: true, email: true }
            }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Generate summary dynamically based on current statistics
    const stats = {
      sent: campaign.totalSent,
      delivered: campaign.totalDelivered,
      failed: campaign.totalFailed,
      opened: campaign.totalOpened,
      clicked: campaign.totalClicked
    };
    
    let summary = 'Campaign insights are currently loading...';
    if (campaign.totalSent > 0) {
      summary = await summarizeCampaign(campaign.name, stats);
    } else {
      summary = 'No messages sent in this campaign.';
    }

    return res.json({
      ...campaign,
      stats,
      summary
    });
  } catch (error: any) {
    console.error('Error fetching campaign details:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// POST to create and trigger campaign
router.post('/', async (req, res) => {
  try {
    const { name, segmentFilters, messageTemplate, channel } = req.body;
    if (!name || !segmentFilters || !messageTemplate || !channel) {
      return res.status(400).json({ error: 'Missing required parameters: name, segmentFilters, messageTemplate, channel' });
    }

    // 1. Resolve matching customers
    const whereQuery = await buildPrismaQuery(segmentFilters);
    const customers = await prisma.customer.findMany({
      where: whereQuery,
      include: {
        orders: {
          orderBy: { orderedAt: 'desc' }
        }
      }
    });

    if (customers.length === 0) {
      return res.status(400).json({ error: 'No matching customers found for this segment.' });
    }

    // 2. Create campaign in RUNNING status
    const campaign = await prisma.campaign.create({
      data: {
        name,
        segmentQuery: segmentFilters,
        messageTemplate,
        channel,
        status: 'RUNNING',
        totalSent: customers.length,
        totalDelivered: 0,
        totalFailed: 0,
        totalOpened: 0,
        totalClicked: 0
      }
    });

    // 3. Create messages and prepare send array
    const messagesToCreate = customers.map((customer: any) => {
      const text = personalizeMessage(messageTemplate, customer);
      return {
        campaignId: campaign.id,
        customerId: customer.id,
        personalizedMessage: text,
        channel,
        status: 'PENDING'
      };
    });

    // Prisma doesn't return created IDs with createMany in some DBs, so we do individual writes or database transaction
    // To get IDs for dispatching to channel-stub, we can do it in a transaction
    const createdMessages = await prisma.$transaction(
      messagesToCreate.map((msg: any) => prisma.message.create({
        data: msg,
        include: {
          customer: {
            select: { phone: true }
          }
        }
      }))
    );

    // 4. Asynchronously send messages in background to not block the server response
    // Using setImmediate or simple async loop
    setImmediate(async () => {
      console.log(`[Campaign Route] Dispatching ${createdMessages.length} messages to channel stub for campaign: ${campaign.name}`);
      for (const msg of createdMessages) {
        // Trigger delivery simulator
        sendToChannel(msg.id, msg.customer.phone, msg.personalizedMessage, msg.channel);
        // Add a small delay between dispatches to prevent overwhelming the connection pool
        await new Promise(r => setTimeout(r, 50));
      }
    });

    return res.status(201).json({
      campaignId: campaign.id,
      totalRecipients: customers.length
    });
  } catch (error: any) {
    console.error('Error launching campaign:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;
