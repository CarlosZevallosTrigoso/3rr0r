# 3rr0r.xyz

Sistema de distribución de fanzines en PDF con tracking avanzado de descargas. Cada descarga genera un PDF personalizado con información del usuario y registra estadísticas en Google Sheets.

## 🎯 Características

- **Generación dinámica de PDFs**: Añade una página personalizada al inicio de cada documento
- **Tracking completo**: Registra IP, ubicación, fecha/hora y contador de descargas
- **Almacenamiento distribuido**: 
  - PDFs originales en Google Drive
  - Contador de descargas en Vercel KV
  - Log de descargas en Google Sheets
- **Interfaz minimalista**: Sitio web estático con diseño tipográfico

## 🛠️ Stack Tecnológico

- **Frontend**: HTML, CSS, JavaScript vanilla
- **Backend**: Vercel Serverless Functions (Node.js)
- **PDF Processing**: pdf-lib
- **Storage**: Google Drive, Vercel KV, Google Sheets
- **Deployment**: Vercel

## 📋 Prerequisitos

- Cuenta de Vercel
- Cuenta de Google Cloud Platform con:
  - Google Drive API habilitada
  - Google Sheets API habilitada
  - Service Account creada
- Vercel KV Database configurado

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/3rr0r.git
cd 3rr0r
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita las APIs:
   - Google Drive API
   - Google Sheets API
4. Crea una Service Account:
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva cuenta de servicio
   - Descarga el archivo JSON con las credenciales
5. Comparte tu Google Drive folder y Google Sheet con el email de la service account

### 4. Configurar variables de entorno en Vercel

Crea las siguientes variables de entorno en tu proyecto de Vercel:

```env
# Google Service Account
GOOGLE_CLIENT_EMAIL=tu-service-account@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA\n-----END PRIVATE KEY-----\n"

# Google Sheets
GOOGLE_SHEET_ID=tu_spreadsheet_id_aqui

# Vercel KV (se configuran automáticamente al crear el KV database)
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=tu_token_aqui
```

**Nota importante sobre GOOGLE_PRIVATE_KEY**: 
- Copia la clave privada completa del archivo JSON de credenciales
- Debe incluir `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
- Mantén los saltos de línea como `\n`

### 5. Configurar Vercel KV

1. En tu proyecto de Vercel, ve a la pestaña "Storage"
2. Crea un nuevo "KV Database"
3. Las variables de entorno se configurarán automáticamente

### 6. Subir PDFs a Google Drive

1. Sube tus PDFs a Google Drive
2. Comparte cada archivo con tu service account email
3. Obtén el ID de cada archivo (está en la URL: `drive.google.com/file/d/FILE_ID_AQUI/view`)
4. Actualiza `ALLOWED_FILES` en `api/download.js`:

```javascript
const ALLOWED_FILES = {
  'nombre_archivo.pdf': 'ID_DE_GOOGLE_DRIVE',
  'otro_archivo.pdf': 'OTRO_ID',
};
```

5. Actualiza `docs/pdfs.json` con la información de tus archivos:

```json
[
  {
    "title": "Título que se mostrará",
    "filename": "nombre_archivo.pdf"
  }
]
```

### 7. Configurar Google Sheet

1. Crea una nueva hoja de cálculo en Google Sheets
2. Compártela con tu service account email (con permisos de edición)
3. Copia el ID del spreadsheet (está en la URL)
4. Configura los encabezados en la primera fila: `Fecha | Hora | Archivo | País | IP | Descarga #`

### 8. Desplegar

```bash
vercel --prod
```

## 📁 Estructura del Proyecto

```
3rr0r/
├── api/
│   └── download.js          # Serverless function para generar PDFs
├── docs/                    # Frontend estático
│   ├── index.html
│   ├── pdfs.json           # Lista de PDFs disponibles
│   └── js/
│       └── main.js
├── package.json
├── vercel.json             # Configuración de Vercel
└── README.md
```

## 🔧 Configuración

### Añadir nuevos PDFs

1. Sube el PDF a Google Drive
2. Comparte con tu service account
3. Añade la entrada en `api/download.js`:
   ```javascript
   const ALLOWED_FILES = {
     'nuevo_archivo.pdf': 'GOOGLE_DRIVE_FILE_ID',
   };
   ```
4. Añade la entrada en `docs/pdfs.json`:
   ```json
   {
     "title": "Nombre del Documento",
     "filename": "nuevo_archivo.pdf"
   }
   ```
5. Redeploy en Vercel

### Modificar el diseño de la página insertada

Edita la sección de generación del PDF en `api/download.js`:

```javascript
const parrafo = `Tu texto personalizado aquí...`;
const numeroDescarga = `Tu descarga es la Nro #${downloadCount}`;

newPage.drawText(parrafo, { 
  x: 50, 
  y: height - 100, 
  font: regularFont, 
  size: 10, 
  lineHeight: 15, 
  maxWidth: width - 100 
});
```

## 🐛 Troubleshooting

### Error 500: "Error interno al generar el PDF"

**Causa**: Variables de entorno mal configuradas o permisos de Google Cloud

**Solución**:
1. Verifica que todas las variables de entorno estén configuradas
2. Asegúrate de que el GOOGLE_PRIVATE_KEY mantenga los saltos de línea (`\n`)
3. Confirma que las APIs estén habilitadas en Google Cloud
4. Verifica que los archivos estén compartidos con el service account

### Los PDFs no se listan en el sitio

**Causa**: Archivo `pdfs.json` mal formateado o no accesible

**Solución**:
1. Verifica que `docs/pdfs.json` tenga formato JSON válido
2. Asegúrate de que los nombres de archivo coincidan con `ALLOWED_FILES`

### El contador no incrementa

**Causa**: Vercel KV no configurado

**Solución**:
1. Crea un Vercel KV database en tu proyecto
2. Verifica que las variables KV_REST_API_URL y KV_REST_API_TOKEN estén configuradas

## 📊 Ver Estadísticas

Todas las descargas se registran en tu Google Sheet con:
- Fecha
- Hora
- Nombre del archivo
- País
- IP
- Número de descarga

## 🔐 Privacidad

Este sistema registra IPs completas. Considera:
- Anonimizar las IPs (ej: último octeto)
- Añadir política de privacidad a tu sitio
- Cumplir con GDPR u otras normativas aplicables

## 📝 Licencia

[Tu licencia aquí]

## 👤 Contacto

- Email: 3rr0r@czt.pe
- Instagram: [@3rr0r.xyz](https://www.instagram.com/3rr0r.xyz/)

---

Hecho con ❤️ para la distribución de fanzines
