import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';
const dbName = `${database}`;

class DBClient {
  constructor() {
    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url);
    this.client.connect((err) => {
      if (err) {
        // const db = this.client.db(dbName);
        console.log(err);
      }
    });
  }

  isAlive() {
    // returns true if connection to MongoDB is a success
    return this.client.isConnected();
  }

  async nbUsers() {
    // finds the number of documents in the users collection
    const db = this.client.db(dbName);
    const users = db.collection('users');
    return users.countDocuments();
    // return this.client.countDocuments();
  }

  async nbFiles() {
    // finds the number of documents in the files collection
    const db = this.client.db(dbName);
    const files = db.collection('files');
    return files.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
