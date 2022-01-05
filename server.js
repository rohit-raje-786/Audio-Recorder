const express = require("express");
const fs = require("fs");
const { promisify } = require("util");
const { v4 } = require("uuid");

const { google } = require("googleapis");
const path = require("path");

const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
require("dotenv").config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

const messageFolder = "./public/messages/";
if (!fs.existsSync(messageFolder)) {
  fs.mkdirSync(messageFolder);
}

const app = express();

app.use(express.static("public"));
app.use(express.json());

app.get("/messages", async (req, res) => {
  readdir(messageFolder)
    .then((messageFilenames) => {
      res.status(200).json({ messageFilenames });
    })
    .catch((err) => {
      console.log("Error reading message directory", err);
      res.sendStatus(500);
    });
});
async function uploadFile() {
  files = await readdir(messageFolder);
  //console.log(files[0]);
  const filePath = path.join(__dirname, `./public/messages/${files[0]}`);
  //console.log(filePath);
  try {
    const response = await drive.files.create({
      resource: {
        name: files[0], //This can be name of your choice
        parents: ["1Os2cTo1jbFNfPI4VmffPb8-fTH47LR9z"],
        mimeType: "video/webm",
      },
      media: {
        mimeType: "video/webm",
        body: fs.createReadStream(filePath),
      },
    });

    console.log(response.data);
    fs.unlinkSync(filePath);
  } catch (error) {
    console.log(error.message);
  }
}
app.post("/messages", (req, res) => {
  //console.log(req.body.message);
  if (!req.body.message) {
    return res.status(400).json({ error: "No req.body.message" });
  }
  const messageId = v4();
  writeFile(messageFolder + messageId, req.body.message, "base64")
    .then(() => {
      res.status(201).json({ message: "Saved message" });
    })
    .catch((err) => {
      console.log("Error writing message to file", err);
      res.sendStatus(500);
    });
  setTimeout(() => {
    uploadFile();
  }, 2000);
});

const PORT = process.env.PORT || 3545;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
