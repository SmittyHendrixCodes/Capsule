import axios from 'axios';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  category: string;
  items: string[];
  description: string;
  cardLast4: string;
}

export const checkReceiptQuality = async (base64Image: string): Promise<{
  readable: boolean;
  reason: string;
}> => {
  const response = await axios.post(
    API_URL,
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Is this image a clear, readable receipt or invoice? Check if the text is legible and the image is clear enough to extract transaction data from.
              
              Respond in JSON only, no other text:
              {
                "readable": true or false,
                "reason": "one short sentence explaining why"
              }`,
            },
          ],
        },
      ],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  const content = response.data.content[0].text;
  const cleaned = content.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
};

export const analyzeReceipt = async (base64Image: string): Promise<ReceiptData> => {
  try {
    const response = await axios.post(
      API_URL,
      {
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: `Analyze this receipt and extract the following information in JSON format only, no other text:
                {
                  "merchant": "store or vendor name",
                  "date": "date of purchase in YYYY-MM-DD format",
                  "total": total amount as a number,
                  "category": "one of: Food, Travel, Office, Shopping, Utilities, Medical, Entertainment, Other",
                  "items": ["list", "of", "purchased", "items"],
                  "description": "brief one sentence summary of the purchase"
                  "cardLast4: "last 4 digits of the card used if visible on receipt, otherwise return 'Cash / Not Available'"
                }`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
      }
    );
    const content = response.data.content[0].text;
    const cleaned = content.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as ReceiptData;
  } catch (error: any) {
    console.log('Status:', error?.response?.status);
    console.log('Error data:', JSON.stringify(error?.response?.data));
    console.log('API Key exists:', !!ANTHROPIC_API_KEY);
    console.log('API Key prefix:', ANTHROPIC_API_KEY?.substring(0, 10));
    throw error;
  }
};

export const generateExportSummary = async (receipts: any[]): Promise<string> => {
  const totalSpend = receipts.reduce((sum, r) => sum + r.total, 0);
  const modules = [...new Set(receipts.map((r) => r.module))];
  const categories = [...new Set(receipts.map((r) => r.category))];
  const merchants = receipts.map((r) => r.merchant).join(', ');
  const dateRange = {
    start: receipts[receipts.length - 1]?.date,
    end: receipts[0]?.date,
  };

  const response = await axios.post(
    API_URL,
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a professional expense report summary paragraph based on these receipts:
          - Total spend: $${totalSpend.toFixed(2)}
          - Date range: ${dateRange.start} to ${dateRange.end}
          - Modules: ${modules.join(', ')}
          - Categories: ${categories.join(', ')}
          - Merchants: ${merchants}
          - Number of receipts: ${receipts.length}
          
          Write 2-3 sentences maximum. Professional tone. Ready to paste into an expense report email. No markdown, plain text only.`,
        },
      ],
    },
    {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
    }
  );

  return response.data.content[0].text;
};