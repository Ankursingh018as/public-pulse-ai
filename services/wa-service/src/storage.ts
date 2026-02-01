import mongoose, { Schema, Document } from 'mongoose';

export interface IRawMessage extends Document {
    source: string;
    externalId: string;
    sender: string;
    content: string;
    timestamp: Date;
    metadata: any;
    processed: boolean;
    createdAt: Date;
}

const RawMessageSchema: Schema = new Schema({
    source: { type: String, required: true, default: 'whatsapp' },
    externalId: { type: String, required: true, unique: true },
    sender: { type: String, required: true }, // Phone number
    content: { type: String },
    timestamp: { type: Date, required: true },
    metadata: { type: Schema.Types.Mixed },
    processed: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const RawMessage = mongoose.model<IRawMessage>('RawMessage', RawMessageSchema);

export async function saveRawMessage(data: any) {
    try {
        const doc = new RawMessage({
            source: 'whatsapp',
            externalId: data.messageId,
            sender: data.from,
            content: data.text,
            timestamp: data.timestamp,
            metadata: data.raw
        });

        await doc.save();
        console.log(`💾 Saved raw message: ${data.messageId}`);
        return doc;
    } catch (error) {
        console.error('Error saving raw message:', error);
        // Don't throw validation errors for duplicates, just log
    }
}
