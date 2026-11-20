// Import the MongoDB client used for the activity log.
import { MongoClient } from 'mongodb';

// Define the local MongoDB connection used when no URI is configured.
const defaultMongoUri = 'mongodb://127.0.0.1:27017/smart_food_waste';
// Prefer the MongoDB URI supplied by the environment.
const uri = process.env.MONGODB_URI || defaultMongoUri;

// Give the global object a typed slot for the pending or resolved Mongo connection.
const globalForMongo = globalThis as unknown as { mongoClientPromise?: Promise<MongoClient> };
// Create a MongoDB client with the selected URI.
const client = new MongoClient(uri);

// Describe the optional entity type and identifier attached to an event.
type EventEntity = { entityType: string; entityId: string | number };

// Reuse a cached connection promise or connect now.
export const mongoClientPromise = globalForMongo.mongoClientPromise ?? client.connect();
// Keep the connection promise across development reloads.
if (process.env.NODE_ENV !== 'production') globalForMongo.mongoClientPromise = mongoClientPromise;

// Provide a helper that returns the database used for logging.
export async function mongoDb() {
  // Wait for the shared MongoDB client to connect.
  const c = await mongoClientPromise;
  // Select the configured database or use the FreshTrack default.
  return c.db(process.env.MONGODB_DB || 'smart_food_waste');
// Finish the MongoDB helper.
}

// Accept the event type, event-specific details and optional entity reference.
export async function logEvent(type: string, details: Record<string, unknown>, entity?: EventEntity) {
  // Protect the primary workflow from an event logging failure.
  try {
    // Wait until the logging database is available.
    const db = await mongoDb();
    // Add one event document to the inventory_events collection.
    await db.collection('inventory_events').insertOne({
      // Record the kind of activity that took place.
      type,
      // Include the entity fields when the caller supplies them.
      ...(entity ?? {}),
      // Store the fields specific to this kind of event.
      details,
      // Record the timestamp at the time of logging.
      createdAt: new Date()
    // Finish the event insert.
    });
  // Handle connection or insert errors locally.
  } catch (e) {
    // Print the failure to server logs without rethrowing it to the caller.
    console.error('Mongo event log failed:', e);
  // End the error handler.
  }
// End the event logger.
}
