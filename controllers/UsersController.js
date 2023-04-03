import bcrypt from 'bcrypt';
import dbClient from '../utils/db';

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
      res.status(400).json({ error: 'Already exist' });
    }

    // hash the password using SHA1
    const saltRounds = 10;
    const hash = bcrypt.hashSync(password, saltRounds);
    const obj = {
      email,
      password: hash,
    };
    // insert new user
    const result = await users.insertOne(obj);
    res.status(201).send({ id: result.insertedId, email });
  }
}

export default UsersController;
