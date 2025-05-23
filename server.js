
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

async function downloadImageWithRetry(imageUrl, outputPath, retries = 5, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Tentativo ${i + 1} di scaricare immagine da: ${imageUrl}`);
      const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(outputPath, response.data);
      console.log(`Immagine scaricata e salvata in: ${outputPath}`);
      return true;
    } catch (err) {
      console.warn(`Fallito tentativo ${i + 1}: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Impossibile scaricare l'immagine dopo vari tentativi.");
}

app.post("/pdf", async (req, res) => {
  const testo = req.body.testo;
  const imageUrl = req.body.img;

  console.log("Ricevuta richiesta PDF");
  console.log("Testo:", testo);
  console.log("URL immagine:", imageUrl);

  if (!testo || !imageUrl) {
    console.error("Dati mancanti nella richiesta");
    return res.status(400).send("Dati mancanti");
  }

  const doc = new PDFDocument();
  const timestamp = Date.now();
  const pdfPath = path.join(__dirname, `poesia_${timestamp}.pdf`);
  const imagePath = path.join(__dirname, `immagine_${timestamp}.png`);

  try {
    await downloadImageWithRetry(imageUrl, imagePath);

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
      console.log("PDF creato con successo:", pdfPath);
      res.sendFile(pdfPath, err => {
        if (!err) {
          fs.unlinkSync(pdfPath);
          fs.unlinkSync(imagePath);
        }
      });
    });
  } catch (err) {
    console.error("Errore durante la generazione del PDF:", err.message);
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
