import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FilesController {
  static async postUpload(req, res) {
    const token = req.get('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) res.status(401).send({ error: 'Unauthorized' });

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
      const file = await files.findOne({ _id: ObjectId(parentId) });
      if (!file) res.status(400).send({ error: 'Parent not found' });
      if (file.type !== 'folder') res.status(400).send({ error: 'Parent is not a folder' });
    }
    const newFile = {
      userId,
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
}

export default FilesController;
