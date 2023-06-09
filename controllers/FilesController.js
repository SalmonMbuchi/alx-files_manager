import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const user = await FilesController.getUserByToken(req);
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    // data
    const {
      name,
      type,
      data,
      parentId,
      isPublic,
    } = req.body;
    if (!name) res.status(400).send({ error: 'Missing name' });
    const acceptedTypes = ['folder', 'file', 'image'];
    if (!type || !acceptedTypes.includes(type)) res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') res.status(400).send({ error: 'Missing data' });
    if (parentId) {
      const files = dbClient.db.collection('files');
      const file = await files.findOne({ _id: ObjectId(parentId), userId: user._id });
      if (!file) res.status(400).send({ error: 'Parent not found' });
      if (file.type !== 'folder') res.status(400).send({ error: 'Parent is not a folder' });
    }
    const newFile = {
      userId: user._id,
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
    };
    if (type === 'folder') {
      const files = dbClient.db.collection('files');
      await files.insertOne(newFile);
      res.status(201).send(newFile);
    } else {
      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager/';
      const filename = uuidv4();
      const localPath = folderPath + filename;
      // Decode the data
      const buff = Buffer.from(data, 'base64');
      const decoded = buff.toString('utf-8');
      // Append to file
      fs.mkdir(folderPath, (err) => {
        if (err) console.log('Failed to create directory', err);
        fs.writeFile(localPath, decoded, (err) => {
          if (err) throw err;
        });
      });
      const files = dbClient.db.collection('files');
      newFile.localPath = localPath;
      newFile.data = data;
      await files.insertOne(newFile);
      res.status(201).send(newFile);
    }
  }

  static async getShow(req, res) {
    const user = await FilesController.getUserByToken(req);
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    // Search for file linked to the user and ID
    const files = dbClient.db.collection('files');
    const id = req.params;
    const file = await files.findOne({ _id: ObjectId(id), userId: user._id });
    if (!file) res.status(404).send({ error: 'Not found' });
    res.status(200).send(file);
  }

  static async getIndex(req, res) {
    const user = await FilesController.getUserByToken(req);
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    // List a file(s) based on parentId and page
    const { parentId, page } = req.query;
    // Find file based on parentId and paginate
    const files = dbClient.db.collection('files');
    const pageSize = 20;
    const pageNumber = page || 1;
    let query;
    if (!parentId) {
      query = { userId: user._id };
    } else {
      query = { userId: user._id, parentId: ObjectId(parentId) };
    }
    const pipeline = [
      { $match: query },
      { $skip: (pageNumber - 1) * pageSize },
      { $limit: pageSize },
    ];
    const results = await files.aggregate(pipeline).toArray();
    const result = results.map((file) => {
      const newFile = {
        ...file,
        id: file._id,
      };
      delete newFile._id;
      delete newFile.localPath;
      return newFile;
    });
    res.status(200).send(result);
  }

  static async putPublish(req, res) {
    const user = await FilesController.getUserByToken(req);
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    const files = dbClient.db.collection('files');
    const id = req.params;
    const filter = { _id: ObjectId(id), userId: user._id };
    const update = { $set: { isPublic: true } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate(filter, update, options, (err, file) => {
      if (err) res.status(404).send({ error: 'Not found' });
      res.status(200).send(file.value);
    });
  }

  static async putUnpublish(req, res) {
    const user = await FilesController.getUserByToken(req);
    if (!user) res.status(401).send({ error: 'Unauthorized' });
    const files = dbClient.db.collection('files');
    const id = req.params;
    const filter = { _id: ObjectId(id), userId: user._id };
    const update = { $set: { isPublic: false } };
    const options = { returnOriginal: false };
    files.findOneAndUpdate(filter, update, options, (err, file) => {
      if (err) res.status(404).send({ error: 'Not found' });
      res.status(200).send(file.value);
    });
  }

  // File data
  static async getFile(req, res) {
    const user = await FilesController.getUserByToken(req);
    const files = dbClient.db.collection('files');
    const id = req.params;
    const file = await files.findOne({ _id: ObjectId(id) });
    if (!file) res.status(404).send({ error: 'Not found' });
    if (!user && file.isPublic === false) {
      res.status(400).send({ error: 'Not found' });
    }
    if (user && file.isPublic === false && file.userId !== user._id) {
      res.status(400).send({ error: 'Not found' });
    }
    if (file.type === 'folder') res.status(400).send({ error: 'A folder doesn\'t have content' });
    fs.access(file.localPath, fs.constants.F_OK, (err) => {
      if (err) res.status(404).send({ error: 'Not found' });
      const contentType = mime.lookup(file.name);
      res.set('Content-Type', contentType);
      res.status(200).send(file);
    });
  }

  static async getUserByToken(req) {
    const token = req.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const users = dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    return user;
  }
}

export default FilesController;
