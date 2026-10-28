import { MongoClient } from 'mongodb';

const defaultMongoUri = 'mongodb://127.0.0.1:27017/smart_food_waste';
const uri = process.env.MONGODB_URI || defaultMongoUri;

const globalForMongo = globalThis as unknown as { mongoClientPromise?: Promise<MongoClient> };
const client = new MongoClient(uri);

type EventEntity = { entityType: string; entityId: string | number };

export const mongoClientPromise = globalForMongo.mongoClientPromise ?? client.connect();
if (process.env.NODE_ENV !== 'production') globalForMongo.mongoClientPromise = mongoClientPromise;

export async function mongoDb() {
  const c = await mongoClientPromise;
  return c.db(process.env.MONGODB_DB || 'smart_food_waste');
}

export async function logEvent(type: string, details: Record<string, unknown>, entity?: EventEntity) {
  try {
    const db = await mongoDb();
    await db.collection('inventory_events').insertOne({
      type,
      ...(entity ?? {}),
      details,
      createdAt: new Date()
    });
  } catch (e) {
    console.error('Mongo event log failed:', e);
  }
}
