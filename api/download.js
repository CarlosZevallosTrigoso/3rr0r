import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { kv } from '@vercel/kv';
import { google } from 'googleapis';

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
    
    // Configurar autenticación de Google con permisos para Drive y Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // Descargar el PDF original desde Google Drive
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    
    const existingPdfBytes = fileResponse.data;
    
    // Incrementar contador de descargas en Vercel KV
    const downloadCount = await kv.incr(`downloads:${requestedFile}`);
    
    // Obtener información de la descarga
    const [fecha, hora] = new Date().toLocaleString('es-ES', { timeZone: 'America/Lima' }).split(', ');
    const ip = req.headers['x-forwarded-for'] || 'IP Desconocida';
    const country = req.headers['x-vercel-ip-country'] || 'País Desconocido';
    
    // Registrar la descarga en Google Sheets
    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const sheetName = 'Hoja 1';
      const rowData = [fecha, hora, requestedFile, country, ip, downloadCount];

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `${sheetName}!A:F`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [rowData],
        },
      });
    } catch (sheetError) {
      console.error('Error al escribir en Google Sheets:', sheetError);
      // No detenemos la descarga si falla el registro en la hoja
    }
    
    // Cargar y modificar el PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Usar fuentes estándar (no requieren archivos externos)
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Crear página de información al inicio
    const originalPages = pdfDoc.getPages();
    const firstPage = originalPages[0];
    const { width, height } = firstPage.getSize();
    const newPage = pdfDoc.insertPage(0, [width, height]);

    // Fondo gris claro
    newPage.drawRectangle({ 
      x: 0, 
      y: 0, 
      width: width, 
      height: height, 
      color: rgb(0.96, 0.96, 0.96) 
    });
    
    // Preparar textos
    const location = `${country} (${ip})`;
    const parrafo = `Has descargado el archivo ${requestedFile} desde 3rr0r.xyz el ${fecha} a las ${hora} desde la IP ${location}. Para mas informacion sobre los proyectos puedes escribir un correo a: 3rr0r@czt.pe o seguir en Instagram a la cuenta @3rr0r.xyz`;
    const numeroDescarga = `Tu descarga es la Nro #${downloadCount}`;
    
    // Dibujar textos en la página
    newPage.drawText(parrafo, { 
      x: 50, 
      y: height - 100, 
      font: regularFont, 
      size: 10, 
      lineHeight: 15, 
      maxWidth: width - 100 
    });
    
    newPage.drawText(numeroDescarga, { 
      x: 50, 
      y: height - 250, 
      font: boldFont, 
      size: 12 
    });
    
    // Generar el PDF final
    const pdfBytes = await pdfDoc.save();
    
    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${requestedFile}"`);
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error principal al procesar el PDF:', error);
    res.status(500).send('Error interno al generar el PDF.');
  }
}
