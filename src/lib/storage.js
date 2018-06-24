// @flow

let gcs;
const Bluebird = require('bluebird');
const cfg = require('./config').cfg;

type ReadableStream = {
  on: Function,
  once: Function,
  end: Function,
  removeListener: Function,
};

/**
 * Given a bucketName, fetch GCS bucket
 * @param {String} bucketName
 */
function getBucket(bucketName: string): Object {
  if (!(cfg.env.GOOGLE_CLOUD_PROJECT && cfg.env.GOOGLE_CLOUD_AUTH)) {
    throw new Error('Cannot get GCS bucket, missing GCP environment variables');
  } else if (!gcs) {
    gcs = require('@google-cloud/storage');
  }

  const config = {
    projectId: cfg.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: null,
    credentials: JSON.parse(Buffer.from(cfg.env.GOOGLE_CLOUD_AUTH, 'base64').toString()),
    promise: Bluebird,
    maxRetries: 5,
  };

  return gcs(config).bucket(bucketName);
}

/**
 * Given a path, a bucket, a file, a content type, and optionally whether the file should be publicly accessibly, upload file to GCS
 * @param {Object} payload
 */
function uploadFile(payload: {path: string, bucket: string, file: Buffer, contentType: string, makePublic: boolean}): Promise<Buffer> {
  return new Bluebird((resolve: Function, reject: Function) => {
    const bucket = getBucket(payload.bucket);
    const file = bucket.file(payload.path);
    const stream = file.createWriteStream({
      metadata: {
        cacheControl: 'no-cache, no-store, must-revalidate',
        pragma: 'no-cache',
        expires: 0,
        contentType: payload.contentType,
      },
      public: payload.makePublic,
    });
    stream.on('error', reject);
    stream.on('finish', resolve);
    stream.end(payload.file);
  });
}

/**
 * Given a bucket and file path, delete the file
 * @param {Object} opts
 */
function deleteFile(opts: {bucket: string, path: string}): Promise<any> {
  const bucket = getBucket(opts.bucket);
  const file = bucket.file(opts.path);
  return file.delete();
}

/**
 * Helper Fn, given a stream, return an ArrayBuffer
 * @param {*} stream
 * @param {*} callback
 */
function streamToArray(stream: ReadableStream, callback: (null|Error, Array<Buffer>) => void): void {
  let arr = [];

  stream.on('data', onData);
  stream.once('end', onEnd);
  stream.once('error', callback);
  stream.once('error', cleanup);
  stream.once('close', cleanup);

  function onData(doc) {
    if (!Array.isArray(arr)) {
      arr = [];
    }
    arr.push(doc);
  }

  function onEnd() {
    callback(null, arr);
    cleanup();
  }

  function cleanup() {
    arr = [];
    stream.removeListener('data', onData);
    stream.removeListener('end', onEnd);
    stream.removeListener('error', callback);
    stream.removeListener('error', cleanup);
    stream.removeListener('close', cleanup);
  }
}

/**
 * Given a stream, return a file
 *
 * Ex:
 * const stream = getBucket('someBucket').file(file.path).createReadStream();
 * return streamToBuffer(stream)
 *  .then((data) => res.write(data));
 */
function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    streamToArray(stream, (err, arr) => {
      if (err) {
        return reject(err);
      } else if (!arr) {
        return reject(new Error('File not found'));
      }
      return resolve(Buffer.concat(arr));
    });
  });
}


module.exports = {getBucket, uploadFile, deleteFile, streamToBuffer};
