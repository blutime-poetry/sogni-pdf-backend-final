
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

async function downloadImage(imageUrl, outputPath) {
  const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, response.data);
}

app.post("/pdf", async (req, res) => {
  const testo = req.body.testo;
  const imageUrl = req.body.img;

  if (!testo || !imageUrl) {
    return res.status(400).send("Dati mancanti");
  }

  const doc = new PDFDocument();
  const timestamp = Date.now();
  const pdfPath = path.join(__dirname, `poesia_${timestamp}.pdf`);
  const imagePath = path.join(__dirname, `immagine_${timestamp}.png`);

  try {
    await downloadImage(imageUrl, imagePath);

    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.font("Times-Roman").fontSize(14);
    testo.split("\n").forEach(line => {
      doc.text(line, { align: "left" });
    });

    doc.moveDown();
    doc.image(imagePath, { fit: [500, 300], align: "center" });

    doc.end();

    writeStream.on("finish", () => {
      res.sendFile(pdfPath, err => {
        if (!err) {
          fs.unlinkSync(pdfPath);
          fs.unlinkSync(imagePath);
        }
      });
    });
  } catch (err) {
    console.error("Errore generazione PDF:", err);
    res.status(500).send("Errore durante la generazione del PDF.");
  }
});

app.get("/", (req, res) => {
  res.send("Server PDF attivo.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
