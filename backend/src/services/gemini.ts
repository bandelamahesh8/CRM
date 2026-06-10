import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini SDK if API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export interface ChatResult {
  intent: 'create_campaign' | 'general_chat';
  campaign_name: string;
  segment: {
    description: string;
    filters: {
      min_orders?: number;
      max_orders?: number;
      inactive_days?: number;
      min_spent?: number;
      max_spent?: number;
      city?: string;
      product_category?: string;
    };
  };
  suggested_message: string;
  channel: 'whatsapp' | 'email' | 'sms';
  reply: string;
}

// Rule-based mock parser for local setup when API Key is missing
function mockAnalyzeIntent(message: string): ChatResult {
  const text = message.toLowerCase();
  const filters: any = {};
  let descriptionParts: string[] = [];

  // Parse min/max orders
  const ordersMatch = text.match(/(?:bought|orders?)\s*(?:>=|at least|more than|min)?\s*(\d+)\s*(?:times|orders)?/i);
  if (ordersMatch) {
    const minOrders = parseInt(ordersMatch[1]);
    filters.min_orders = minOrders;
    descriptionParts.push(`with at least ${minOrders} order(s)`);
  }

  // Parse inactive days
  const inactiveMatch = text.match(/(?:inactive|haven't bought|no purchases?)\s*(?:for|in)?\s*(\d+)\s*(?:days|months?)/i);
  if (inactiveMatch) {
    let days = parseInt(inactiveMatch[1]);
    if (text.includes('month')) {
      days = days * 30;
    }
    filters.inactive_days = days;
    descriptionParts.push(`inactive for over ${days} days`);
  }

  // Parse min spent
  const spentMatch = text.match(/(?:spent|spent more than|min spent|spent >=)\s*(?:rs\.?|inr|usd)?\s*(\d+)/i);
  if (spentMatch) {
    const minSpent = parseInt(spentMatch[1]);
    filters.min_spent = minSpent;
    descriptionParts.push(`who spent more than ₹${minSpent}`);
  }

  // Parse city
  const cities = ['mumbai', 'delhi', 'bengaluru', 'hyderabad', 'chennai', 'pune'];
  const matchedCities = cities.filter(city => text.includes(city));
  if (matchedCities.length > 0) {
    filters.city = matchedCities.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(',');
    descriptionParts.push(`located in ${filters.city.split(',').join(' or ')}`);
  }

  // Parse product category
  const categories = ['fashion', 'beauty', 'electronics', 'food & beverage'];
  const matchedCat = categories.find(cat => text.includes(cat) || (cat === 'food & beverage' && (text.includes('food') || text.includes('beverage'))));
  if (matchedCat) {
    const formattedCat = matchedCat === 'food & beverage' ? 'Food & Beverage' : matchedCat.charAt(0).toUpperCase() + matchedCat.slice(1);
    filters.product_category = formattedCat;
    descriptionParts.push(`purchased from ${formattedCat}`);
  }

  // Determine channel
  let channel: 'whatsapp' | 'email' | 'sms' = 'whatsapp';
  if (text.includes('email') || text.includes('mail')) {
    channel = 'email';
  } else if (text.includes('sms') || text.includes('text') || text.includes('phone')) {
    channel = 'sms';
  }

  const isCreateCampaign = Object.keys(filters).length > 0 || text.includes('campaign') || text.includes('segment') || text.includes('reach');

  if (isCreateCampaign) {
    const desc = `Customers ` + (descriptionParts.length > 0 ? descriptionParts.join(' and ') : 'all in database');
    let template = "Hey {name}! 🌟 Enjoy an exclusive discount on us. Use code SAVE15.";
    if (channel === 'whatsapp') {
      template = `Hi {name}! 👋 We have a special surprise for you in {city}. Use code WELCOME20 for 20% off your next purchase of {last_product}!`;
    } else if (channel === 'email') {
      template = `Dear {name},\n\nWe noticed you loved shopping in {city}. Here is a curated selection of our new arrivals just for you!\n\nBest,\nTeam Xeno`;
    } else {
      template = `Hey {name}, get 15% off today! Visit your nearest store in {city}. Code: XENO15`;
    }

    return {
      intent: 'create_campaign',
      campaign_name: `${filters.city || 'Smart'} Win-Back ${channel.toUpperCase()}`,
      segment: {
        description: desc,
        filters
      },
      suggested_message: template,
      channel,
      reply: `I've analyzed your request and built an audience segment for: ${desc}. I've drafted a personalized campaign for ${channel.toUpperCase()}. Would you like to review the segment preview below and launch this campaign?`
    };
  }

  return {
    intent: 'general_chat',
    campaign_name: '',
    segment: { description: '', filters: {} },
    suggested_message: '',
    channel: 'whatsapp',
    reply: "Hello! I am your AI Mini CRM Assistant. You can describe your target audience in plain English (e.g., 'customers in Mumbai who bought beauty products at least twice') and I will create the segment and draft a personalized campaign for you!"
  };
}

export async function analyzeIntent(message: string, history: { role: string; content: string }[] = []): Promise<ChatResult> {
  if (!genAI) {
    console.log('[AI Service] Gemini API Key not found. Falling back to local rule-based intent analyzer.');
    return mockAnalyzeIntent(message);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' }
    });

    const systemPrompt = `You are the AI backend of Xeno Mini CRM. Your goal is to parse marketer queries and extract audience segment filters, a suggested campaign template, and communication channels.
You must output a structured JSON matching this schema:
{
  "intent": "create_campaign" | "general_chat",
  "campaign_name": "A creative campaign name representing the segment and target",
  "segment": {
    "description": "Short explanation of who is targeted, e.g. customers in Mumbai who purchased Electronics",
    "filters": {
      "min_orders": number (optional, purchase count),
      "max_orders": number (optional),
      "inactive_days": number (optional, inactive for N days since last order),
      "min_spent": number (optional, total spent amount),
      "max_spent": number (optional),
      "city": "string" (optional, comma-separated list of cities, e.g. 'Mumbai,Delhi'),
      "product_category": "string" (optional, must be 'Fashion', 'Beauty', 'Electronics', or 'Food & Beverage')
    }
  },
  "suggested_message": "A highly personalized marketing template. Must use curly braces placeholder tags: {name}, {city}, or {last_product} to dynamically inject recipient customer fields.",
  "channel": "whatsapp" | "email" | "sms" (default to whatsapp if unspecified),
  "reply": "A helpful conversational reply explaining what segment was found, how many filters applied, and presenting the proposed campaign draft."
}

Use "create_campaign" intent if the marketer specifies target filters, locations, spends, categories, or asks to create/run a campaign.
Otherwise use "general_chat" intent and provide a friendly conversational response welcoming them to Xeno CRM or answering general questions about the system.`;

    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      })),
      systemInstruction: systemPrompt
    });

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();
    console.log('[AI Service] Gemini Raw response:', responseText);

    return JSON.parse(responseText.trim()) as ChatResult;
  } catch (error) {
    console.error('[AI Service] Gemini API call failed, falling back to mock parser:', error);
    return mockAnalyzeIntent(message);
  }
}

export async function summarizeCampaign(name: string, stats: any): Promise<string> {
  if (!genAI) {
    // Mock summary fallback
    const ctr = stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : '0';
    const openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : '0';
    return `Your campaign "${name}" finished running. It achieved an open rate of ${openRate}% and a click-through rate of ${ctr}%. The channel delivery was stable and performance met target benchmarks.`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `Generate a friendly, brief, and professional summary of the performance of this marketing campaign:
Campaign Name: "${name}"
Stats:
- Total Sent: ${stats.sent}
- Total Delivered: ${stats.delivered}
- Total Failed: ${stats.failed}
- Total Opened: ${stats.opened}
- Total Clicked: ${stats.clicked}

Rules:
1. Write 2-3 sentences max.
2. Calculate and highlight the open rate and click-through rate (CTR) based on Sent.
3. Sound encouraging and analytical like a marketing advisor.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('[AI Service] Gemini summary failed, returning default:', error);
    const ctr = stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : '0';
    const openRate = stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : '0';
    return `The "${name}" campaign reached its targeted segment. Out of ${stats.sent} sent, ${stats.opened} were opened (${openRate}% Open Rate) and ${stats.clicked} clicked (${ctr}% CTR).`;
  }
}
