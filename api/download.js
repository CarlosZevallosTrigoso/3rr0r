import { PDFDocument, rgb } from 'pdf-lib';
import { kv } from '@vercel/kv';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// IMPORTANTE: Asegúrate de que estos IDs de archivo de Google Drive sean los correctos.
const ALLOWED_FILES = {
  'fanzine_trilce.pdf': '1rZKugNVcgbEOcy_nVQGIctORsq-UllQv',
  'fanzine_trilce_2.pdf': '1SowgzGhUmD_zANG2s9fE1QoOJjKV5jAJ',
  'fanzine_trilce_3.pdf': '1pEeJYbJqDzt7Z5hp1bnsu-Was5ZZQnlE'
};

export default async function handler(req, res) {
  try {
    const requestedFile = req.query.file;
    const fileId = ALLOWED_FILES[requestedFile];

    if (!fileId) {
      return res.status(400).send('Error: Archivo no válido o no permitido.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    const existingPdfBytes = fileResponse.data;

    const downloadCount = await kv.incr(`downloads:${requestedFile}`);
    
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // --- MEJORA: Cargar la fuente personalizada Fira Code ---
    const firaCodeRegularBytes = await fs.readFile(path.resolve('./assets/fonts', 'FiraCode-Regular.ttf'));
    const firaCodeBoldBytes = await fs.readFile(path.resolve('./assets/fonts', 'FiraCode-Bold.ttf'));

    const firaCodeFont = await pdfDoc.embedFont(firaCodeRegularBytes);
    const firaCodeBoldFont = await pdfDoc.embedFont(firaCodeBoldBytes);
    
    const originalPages = pdfDoc.getPages();
    const firstPage = originalPages[0];
    const { width, height } = firstPage.getSize();

    const newPage = pdfDoc.insertPage(0, [width, height]);

    newPage.drawRectangle({
        x: 0, y: 0, width: width, height: height,
        color: rgb(0.96, 0.96, 0.96),
    });

    const [fecha, hora] = new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }).split(', ');
    const ip = req.headers['x-forwarded-for'] || 'IP Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'País Desconocido';
    const location = `${country} (${ip})`;

    const parrafo = `Has descargado el archivo ${requestedFile} desde 3rr0r.xyz el ${fecha} a las ${hora} desde la IP ${location}. Para más información sobre los proyectos puedes escribir un correo a: 3rr0r@czt.pe o seguir en Instagram a la cuenta @3rr0r.xyz`;
    const numeroDescarga = `Tu descarga es la Nro #${downloadCount}`;

    // --- MEJORA: Usar Fira Code y tamaño 10pt ---
    newPage.drawText(parrafo, {
      x: 50,
      y: height - 100,
      font: firaCodeFont, // <-- Usando Fira Code
      size: 10,             // <-- Tamaño 10
      lineHeight: 15,
      maxWidth: width - 100,
    });
    
    newPage.drawText(numeroDescarga, {
      x: 50,
      y: height - 250,
      font: firaCodeBoldFont, // <-- Usando Fira Code Bold
      size: 11,               // <-- Tamaño 11 para resaltar un poco
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="documento-${requestedFile}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error al procesar el PDF:', error);
    res.status(500).send('Error interno al generar el PDF.');
  }
}
