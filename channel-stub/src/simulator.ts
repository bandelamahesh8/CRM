import axios from 'axios';

const CRM_RECEIPT_URL = process.env.CRM_RECEIPT_URL || 'http://localhost:5000/api/receipts';

interface MessagePayload {
  messageId: string;
  recipientPhone: string;
  text: string;
  channel: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function postReceiptWithRetry(messageId: string, event: string, retries = 3, delayMs = 1000) {
  try {
    const payload = {
      messageId,
      event,
      timestamp: new Date().toISOString()
    };
    
    console.log(`[Simulator] Sending callback for message ${messageId}: Event = ${event}`);
    await axios.post(CRM_RECEIPT_URL, payload);
    console.log(`[Simulator] Callback succeeded for message ${messageId} (Event: ${event})`);
  } catch (error: any) {
    console.error(`[Simulator] Callback failed for message ${messageId} (Event: ${event}), error: ${error.message}`);
    if (retries > 0) {
      console.log(`[Simulator] Retrying callback in ${delayMs}ms. Retries remaining: ${retries}`);
      await sleep(delayMs);
      await postReceiptWithRetry(messageId, event, retries - 1, delayMs * 2);
    } else {
      console.error(`[Simulator] Exhausted all retries for message ${messageId} (Event: ${event})`);
    }
  }
}

export function simulateLifecycle(payload: MessagePayload) {
  const { messageId } = payload;

  // Initial delay 1 - 5 seconds
  const initialDelay = Math.floor(Math.random() * 4000) + 1000;
  
  setTimeout(async () => {
    const rand = Math.random();
    
    // 10% FAILED, 90% DELIVERED
    if (rand < 0.10) {
      await postReceiptWithRetry(messageId, 'failed');
      return;
    }

    // DELIVERED
    await postReceiptWithRetry(messageId, 'delivered');

    // of delivered, 40% OPENED
    const openRand = Math.random();
    if (openRand < 0.40) {
      const openDelay = Math.floor(Math.random() * 6000) + 2000; // 2 - 8s
      await sleep(openDelay);
      await postReceiptWithRetry(messageId, 'opened');

      // of opened, 25% CLICKED
      const clickRand = Math.random();
      if (clickRand < 0.25) {
        const clickDelay = Math.floor(Math.random() * 7000) + 3000; // 3 - 10s
        await sleep(clickDelay);
        await postReceiptWithRetry(messageId, 'clicked');
      }
    }
  }, initialDelay);
}
