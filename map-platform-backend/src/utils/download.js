import fs from 'fs';
import axios from 'axios';

/**
 * Download a remote file to a local path.
 * @param {string} url
 * @param {string} dest
 * @returns {Promise<void>}
 */
export async function download(url, dest) {
  const writer = fs.createWriteStream(dest);
  const res = await axios({ url, method: 'GET', responseType: 'stream' });
  await new Promise((resolve, reject) => {
    res.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}
