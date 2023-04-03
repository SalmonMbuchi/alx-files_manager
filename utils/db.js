import { MongoClient } from 'mongodb';

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 27017;
const database = process.env.DB_DATABASE || 'files_manager';

class DBClient {
  constructor() {
    const url = `mongodb://${host}:${port}`;
    MongoClient.connect(url, (err, client) => {
      if (err) {
        console.log(err);
      }
      this.db = client.db(database);
      this.users = this.db.collection('users');
      this.files = this.db.collection('files');
    });
  }

  isAlive() {
    // returns true if connection to MongoDB is a success
    return !!this.db;
  }

  async nbUsers() {
    // finds the number of documents in the users collection
    return this.users.countDocuments();
  }

  async nbFiles() {
    // finds the number of documents in the files collection
    return this.files.countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
