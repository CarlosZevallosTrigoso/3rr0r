document.addEventListener('DOMContentLoaded', async () => {
    const listElement = document.getElementById('pdf-list');

    if (!listElement) {
        console.error('Error: No se encontró el elemento con id="pdf-list" en el HTML.');
        return;
    }

    try {
        // Carga los datos desde pdfs.json
        const response = await fetch('pdfs.json');
        if (!response.ok) {
            throw new Error(`Error al cargar pdfs.json: ${response.statusText}`);
        }
        const pdfs = await response.json();

        if (pdfs.length === 0) {
            listElement.innerHTML = '<li>Actualmente no hay documentos disponibles.</li>';
            return;
        }
        
        listElement.innerHTML = ''; // Limpia la lista

        // Crea un enlace <a> para cada PDF
        pdfs.forEach(pdf => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            // URL de tu app en Vercel que genera los PDFs
            const vercelAppUrl = 'https://3rr0r.vercel.app';
            
            link.href = `${vercelAppUrl}/api/download?file=${pdf.filename}`;
            link.textContent = pdf.title;

            listItem.appendChild(link);
            listElement.appendChild(listItem);
        });

    } catch (error) {
        console.error('Error al procesar la lista de PDFs:', error);
        listElement.innerHTML = '<li>No se pudieron cargar los documentos. Revisa la consola para más detalles.</li>';
    }
});
