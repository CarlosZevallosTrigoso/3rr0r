import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { kv } from '@vercel/kv';
import { google } from 'googleapis';

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

    // Autenticación con Google Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Descarga del archivo desde Google Drive
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    const existingPdfBytes = fileResponse.data;

    // Conteo de descargas individual por archivo
    const downloadCount = await kv.incr(`downloads:${requestedFile}`);
    
    // Carga del documento PDF con pdf-lib
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- MEJORA 1: Igualar el tamaño de la página ---
    const originalPages = pdfDoc.getPages();
    const firstPage = originalPages[0];
    const { width, height } = firstPage.getSize();
    const newPage = pdfDoc.addPage([width, height]); // Se crea la página con el mismo tamaño

    // --- MEJORA 2: Nuevo formato de texto ---
    const [fecha, hora] = new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }).split(', ');
    const ip = req.headers['x-forwarded-for'] || 'IP Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'País Desconocido';
    const location = `${country} (${ip})`;

    const parrafo = `Has descargado el archivo ${requestedFile} desde 3rr0r.xyz el ${fecha} a las ${hora} desde la IP ${location}. Para más información sobre los proyectos puedes escribir un correo a: 3rr0r@czt.pe o seguir en Instagram a la cuenta @3rr0r.xyz`;
    const numeroDescarga = `Tu descarga es la Nro #${downloadCount}`;

    // Dibujar el nuevo texto en la página
    newPage.drawText(parrafo, {
      x: 50,
      y: height - 100, // Posición inicial desde arriba
      font: helveticaFont,
      size: 12,
      lineHeight: 18,
      maxWidth: width - 100, // Márgenes para que el texto no se desborde
    });
    
    newPage.drawText(numeroDescarga, {
      x: 50,
      y: height - 250, // Posición más abajo para el número de descarga
      font: helveticaBoldFont, // Usando la fuente en negrita
      size: 14,
    });

    // Guardar y enviar el PDF modificado
    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="documento-${requestedFile}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error al procesar el PDF:', error);
    res.status(500).send('Error interno al generar el PDF.');
  }
}
