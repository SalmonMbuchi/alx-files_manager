import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.client.on('error', (err) => {
      console.log('Redis client not connected to the server', err);
    });
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    const value = await this.getAsync(key);
    return value;
  }

  async set(key, value, time) {
    this.client.setex(key, time, value);
  }

  async del(key) {
    this.client.del(key);
  }
}

const redisClient = new RedisClient();
export default redisClient;
