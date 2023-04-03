import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppContoller {
  static getStatus(req, res) {
    const json = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    res.status(200).send(json);
  }

  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();

    res.status(200).json({ users, files });
  }
}

export default AppContoller;
