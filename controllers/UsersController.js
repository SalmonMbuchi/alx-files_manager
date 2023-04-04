import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    const [email, password] = [req.body.email, req.body.password];
    if (!email) {
      res.status(400).send({ error: 'Missing email' });
    }
    if (!password) {
      res.status(400).send({ error: 'Missing password' });
    }
    // check if user already exists in the user collection
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ email });
    if (user) {
      res.status(400).send({ error: 'Already exist' });
    }

    // hash the password using SHA1
    const hash = crypto.createHash('sha1').update(password).digest('hex');
    const obj = {
      email,
      password: hash,
    };
    // insert new user
    const result = await users.insertOne(obj);
    res.status(201).send({ id: result.insertedId, email });
  }

  static async getMe(req, res) {
    const token = req.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) res.status(401).send({ error: 'Unauthorized' });
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    res.send({ email: user.email, id: userId });
  }
}

export default UsersController;
