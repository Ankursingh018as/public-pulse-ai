import { Express, Request, Response } from 'express';
import axios from 'axios';
import { saveRawMessage } from './storage';

export function setupWebhook(app: Express) {
    const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    // 1. Webhook Verification (GET)
    app.get('/webhook', (req: Request, res: Response) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400);
        }
    });

    // 2. Event Notifications (POST)
    app.post('/webhook', async (req: Request, res: Response) => {
        try {
            const body = req.body;

            // Check if this is an event from a page subscription
            if (body.object === 'whatsapp_business_account') {

                // Iterate over each entry - there may be multiple if batched
                for (const entry of body.entry) {
                    for (const change of entry.changes) {
                        const value = change.value;

                        if (value.messages) {
                            for (const message of value.messages) {
                                // Async processing of message
                                await processMessage(message, value.metadata?.display_phone_number);
                            }
                        }
                    }
                }

                res.sendStatus(200);
            } else {
                res.sendStatus(404);
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.sendStatus(500);
        }
    });
}

async function processMessage(message: any, businessPhoneNumber: string) {
    console.log(`Received message from ${message.from}: ${message.type}`);

    // 1. Extract raw data
    const rawData = {
        messageId: message.id,
        from: message.from,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        type: message.type,
        text: message.text?.body || message.caption || '',
        raw: message
    };

    // 2. Save to Raw Storage (MongoDB)
    await saveRawMessage(rawData);

    // 3. Push to AI Engine for processing
    try {
        const aiUrl = process.env.AI_ENGINE_URL || 'http://localhost:8000';
        console.log(`🚀 Forwarding to AI Engine: ${aiUrl}/process/text`);

        await axios.post(`${aiUrl}/process/text`, {
            text: rawData.text,
            source: 'whatsapp',
            metadata: {
                sender: rawData.from,
                original_timestamp: rawData.timestamp
            }
        });
        console.log('✅ AI Processing Triggered');
    } catch (error) {
        console.error('❌ Failed to trigger AI Engine:', error);
    }
}
