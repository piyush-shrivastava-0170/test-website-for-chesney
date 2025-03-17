const functions = require("firebase-functions");
const admin = require("firebase-admin");
const ffmpeg = require("fluent-ffmpeg");
const { Storage } = require("@google-cloud/storage");
const axios = require("axios");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Initialize Firebase Admin SDK
admin.initializeApp();
const storage = new Storage();

exports.transcodeVideo = functions.https.onRequest(async (req, res) => {
  try {
    const { videoUrl, userId, fileName } = req.body;
    if (!videoUrl || !userId || !fileName) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    const resolutions = {
      "4K": "3840x2160",
      "1080p": "1920x1080",
      "720p": "1280x720",
    };

    // Define temporary input file path
    const tempInputPath = path.join(os.tmpdir(), fileName);

    // Download the original video
    console.log(`Downloading video from: ${videoUrl}`);
    const response = await axios({ url: videoUrl, responseType: "stream" });
    const writer = fs.createWriteStream(tempInputPath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    console.log("Download complete. Starting transcoding...");

    const outputUrls = {};
    const bucket = storage.bucket("your-bucket-name"); // Replace with your bucket name

    for (const [label, resolution] of Object.entries(resolutions)) {
      const outputPath = tempInputPath.replace(".mp4", `_${label}.mp4`);
      console.log(`Transcoding ${label} resolution...`);

      try {
        await transcode(tempInputPath, outputPath, resolution);

        // Upload transcoded video to Firebase Storage
        const destination = `users/${userId}/videos/${label}_${fileName}`;
        await bucket.upload(outputPath, { destination });

        // Get public URL of the uploaded video
        outputUrls[label] = `https://storage.googleapis.com/${bucket.name}/${destination}`;
        console.log(`${label} video uploaded to: ${outputUrls[label]}`);

        // Delete temporary transcoded file
        fs.unlinkSync(outputPath);
      } catch (transcodeError) {
        console.error(`Failed to transcode ${label} resolution:`, transcodeError);
      }
    }

    // Cleanup the original temporary file
    fs.unlinkSync(tempInputPath);
    console.log("All processes completed successfully.");

    return res.json({ urls: outputUrls });

  } catch (error) {
    console.error("Transcoding failed:", error);
    return res.status(500).json({ error: "Transcoding failed" });
  }
});

// Function to transcode video to a given resolution
function transcode(input, output, resolution) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .output(output)
      .size(resolution)
      .on("end", () => {
        console.log(`Transcoding to ${resolution} complete.`);
        resolve();
      })
      .on("error", (error) => {
        console.error(`FFmpeg error while transcoding to ${resolution}:`, error);
        reject(error);
      })
      .run();
  });
}
