import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    let encoded = req.get('Authorization');
    // Decode the base64 string
    encoded = encoded.split('Basic ');
    const buff = Buffer.from(encoded[1], 'base64');
    const decoded = buff.toString('utf-8');
    // split the string
    const emailPassword = decoded.split(':');
    // Check if user exists
    const users = dbClient.db.collection('users');
    const [email, password] = [emailPassword[0], emailPassword[1]];
    const hash = createHash('sha1').update(password).digest('hex');
    const user = await users.findOne({ email, password: hash });
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    // generate uuidv4 string
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id, 86400);
    // res.set('X-Token', token);
    res.status(200).send({ token });
  }

  static async getDisconnect(req, res) {
    const token = req.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) res.status(401).send({ error: 'Unauthorized' });
    await redisClient.del(key);
    res.status(204).send();
  }
}

export default AuthController;
