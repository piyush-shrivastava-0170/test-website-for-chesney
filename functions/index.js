/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const ffmpeg = require("fluent-ffmpeg");
const {Storage} = require("@google-cloud/storage");
const axios = require("axios");
const os = require("os");
const path = require("path");
const fs = require("fs");

admin.initializeApp();
const storage = new Storage();

// Video Transcoding Function
exports.transcodeVideo = onRequest(async (req, res) => {
  try {
    const {videoUrl, userId, fileName} = req.body;
    if (!videoUrl || !userId || !fileName) {
      logger.error("Missing required parameters");
      return res.status(400).json({error: "Missing required parameters"});
    }

    logger.info("Starting transcoding process ", {videoUrl, userId, fileName});

    const resolutions = {
      "4K": "3840x2160",
      "1080p": "1920x1080",
      "720p": "1280x720",
    };

    const tempInputPath = path.join(os.tmpdir(), fileName);
    const response = await axios({url: videoUrl, responseType: "stream"});
    const writer = fs.createWriteStream(tempInputPath);
    response.data.pipe(writer);

    await new Promise((resolve) => writer.on("finish", resolve));

    const outputUrls = {};
    const bucketName = "cheney-25352.appspot.com";

    for (const [label, resolution] of Object.entries(resolutions)) {
      const outputPath = tempInputPath.replace(".mp4", `_${label}.mp4`);
      await transcode(tempInputPath, outputPath, resolution);

      const destination = `users/${userId}/videos/${label}_${fileName}`;
      await storage.bucket(bucketName).upload(outputPath, {destination});

      outputUrls[label] = `https://storage.googleapis.com/${bucketName}/${destination}`;
      fs.unlinkSync(outputPath);
    }

    fs.unlinkSync(tempInputPath);
    logger.info("Transcoding complete", {urls: outputUrls});
    return res.json({urls: outputUrls});
  } catch (error) {
    logger.error("Transcoding failed:", error);
    return res.status(500).json({error: "Transcoding failed"});
  }
});

// Helper function for transcoding
function transcode(input, output, resolution) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
        .output(output)
        .size(resolution)
        .on("end", resolve)
        .on("error", reject)
        .run();
  });
}
