import { MongoClient } from 'mongodb';

const MONGODB_URI = import.meta.env.VITE_MONGODB_URI || 'mongodb+srv://amrendrabahubali9500:NliTHOaXCOlBpnb7@chargenet.djic8n6.mongodb.net/?retryWrites=true&w=majority&appName=Chargenet';
const DB_NAME = import.meta.env.VITE_MONGODB_DB_NAME || 'chargenet';

let client: MongoClient | null = null;
let db: any = null;

export const connectToDatabase = async () => {
  if (!client) {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
  }
  return { client, db };
};

export const getDatabase = async () => {
  if (!db) {
    await connectToDatabase();
  }
  return db;
};

// MongoDB collections
export const collections = {
  users: 'users',
  chargers: 'chargers',
  bookings: 'bookings',
  rewards: 'rewards',
  userRewards: 'user_rewards',
  tokensTransactions: 'tokens_transactions',
  rides: 'rides'
};

// Helper function to generate ObjectId
export const generateId = () => {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2);
};

export { client as mongodb };