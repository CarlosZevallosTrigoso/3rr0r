// api/download.js
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { kv } from '@vercel/kv';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req, res) {
  try {
    const downloadCount = await kv.incr('downloads');
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' });
    const ip = req.headers['x-forwarded-for'] || 'IP Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'País Desconocido';
    const location = `${country} (${ip})`;

    const pdfPath = path.resolve('./assets', 'original.pdf');
    const existingPdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const newPage = pdfDoc.addPage();
    const { width, height } = newPage.getSize();
    const textContent = `
      --- Registro de Descarga ---
      Número de Descarga: #${downloadCount}
      Fecha y Hora: ${timestamp}
      Ubicación (IP): ${location}
    `;
    newPage.drawText(textContent, {
      x: 50, y: height - 100, font: helveticaFont, size: 12,
      color: rgb(0.2, 0.2, 0.2), lineHeight: 24,
    });

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento-personalizado.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error(error);
    res.status(500).send('Error al generar el PDF. Asegúrate de que el archivo assets/original.pdf existe.');
  }
}
