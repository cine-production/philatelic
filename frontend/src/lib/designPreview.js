// Charge pdf.js depuis un CDN à la demande (pas de dépendance npm à installer)
// pour transformer la 1ère page d'un PDF en image, utilisée comme aperçu.
let pdfjsLoadingPromise = null;

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (pdfjsLoadingPromise) return pdfjsLoadingPromise;

  pdfjsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => reject(new Error('Impossible de charger le lecteur PDF'));
    document.head.appendChild(script);
  });

  return pdfjsLoadingPromise;
}

// Convertit un File en base64 (data URL) complet, tel quel.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Rend la 1ère page d'un PDF (à partir de son ArrayBuffer) en PNG data URL.
async function renderPdfFirstPageToDataUrl(arrayBuffer) {
  const pdfjsLib = await loadPdfJs();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

// Point d'entrée : à partir d'un File (PNG ou PDF), retourne
// { fileBase64, fileType, previewDataUrl } où previewDataUrl est toujours une image
// affichable (le PNG lui-même, ou la 1ère page du PDF rendue en image).
export async function processDesignFile(file) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

  if (!isPdf && !isPng) {
    throw new Error('Seuls les fichiers PNG ou PDF sont acceptés.');
  }

  const fileBase64 = await fileToBase64(file);

  if (isPng) {
    return { fileBase64, fileType: file.type || 'image/png', previewDataUrl: fileBase64 };
  }

  // PDF : on rend la première page en image pour l'aperçu
  const arrayBuffer = await file.arrayBuffer();
  const previewDataUrl = await renderPdfFirstPageToDataUrl(arrayBuffer);
  return { fileBase64, fileType: 'application/pdf', previewDataUrl };
}
