// api/download.js
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { kv } from '@vercel/kv';
import { google } from 'googleapis';

// Lista blanca de IDs de archivos permitidos de Google Drive
// ¡Usa los IDs de tus archivos, no los nombres!
const ALLOWED_FILES = {
  'fanzine_trilce.pdf': '1rZKugNVcgbEOcy_nVQGIctORsq-UllQv',
  'guia-inicio-rapido.pdf': 'ID_UNICO_DE_TU_ARCHIVO_EN_DRIVE_2',
  'manual-seguridad.pdf': 'ID_UNICO_DE_TU_ARCHIVO_EN_DRIVE_3'
};

export default async function handler(req, res) {
  try {
    const requestedFile = req.query.file;
    const fileId = ALLOWED_FILES[requestedFile];

    if (!fileId) {
      return res.status(400).send('Error: Archivo no válido o no permitido.');
    }

    // --- AUTENTICACIÓN CON GOOGLE DRIVE ---
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Asegura formato correcto
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // --- DESCARGAR EL ARCHIVO DE GOOGLE DRIVE ---
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const existingPdfBytes = fileResponse.data;

    // --- EL RESTO DEL CÓDIGO ES IGUAL ---
    const downloadCount = await kv.incr('downloads');
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' });
    const ip = req.headers['x-forwarded-for'] || 'IP Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'País Desconocido';
    const location = `${country} (${ip})`;

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const newPage = pdfDoc.addPage();
    const { width, height } = newPage.getSize();

    const textContent = `
      --- Registro de Descarga ---
      Documento: ${requestedFile}
      Número de Descarga Global: #${downloadCount}
      Fecha y Hora: ${timestamp}
      Ubicación (IP): ${location}
    `;

    newPage.drawText(textContent, {
      x: 50, y: height - 100, font: helveticaFont, size: 12,
      color: rgb(0.2, 0.2, 0.2), lineHeight: 24,
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${requestedFile}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error al procesar el PDF desde Google Drive:', error);
    res.status(500).send('Error interno al generar el PDF.');
  }
}
