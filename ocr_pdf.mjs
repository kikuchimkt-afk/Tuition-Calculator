import fs from 'fs';
import Tesseract from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure worker? 
// For Node, we might run without worker or point to worker.
// pdfjsLib.GlobalWorkerOptions.workerSrc = '...'; 
// Let's try without setting workerSrc first, providing a fake worker or relying on main thread fake worker if avail.
// Actually, in recent PDF.js, we MUST invoke `getDocument` carefully.

async function renderPageToBuffer(page) {
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvasFactory: {
            create: (w, h) => {
                const c = createCanvas(w, h); // @napi-rs/canvas
                return {
                    canvas: c,
                    context: c.getContext('2d')
                };
            },
            reset: (obj, w, h) => {
                obj.canvas.width = w;
                obj.canvas.height = h;
            },
            destroy: (obj) => {
                obj.canvas.width = 0;
                obj.canvas.height = 0;
                obj.canvas = null;
                obj.context = null;
            }
        }
    };

    await page.render(renderContext).promise;
    return canvas.toBuffer('image/png');
}

async function processFile(file) {
    if (!fs.existsSync(file)) {
        return `\nFile not found: ${file}\n`;
    }
    console.log(`Processing ${file}...`);

    const data = new Uint8Array(fs.readFileSync(file));
    const loadingTask = pdfjsLib.getDocument({
        data: data,
        // We use StandardFontData from the package if needed
        standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
        cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
        cMapPacked: true,
        // Disable worker if possible to modify
        disableFontFace: true, // sometimes helpful in node
    });

    const doc = await loadingTask.promise;
    let fullText = `\n\n=== CONTENT OF ${file} (OCR) ===\n\n`;

    for (let i = 1; i <= doc.numPages; i++) {
        console.log(`  Page ${i}/${doc.numPages}... rendering...`);
        const page = await doc.getPage(i);
        const buffer = await renderPageToBuffer(page);

        console.log(`  Page ${i}/${doc.numPages}... recognizing text...`);
        // Tesseract.js recognizes Buffer natively in Node
        const { data: { text } } = await Tesseract.recognize(
            buffer,
            'jpn',
        );
        fullText += `\n--- Page ${i} ---\n${text}\n`;
    }

    return fullText;
}

async function main() {
    const files = [
        'ベストワン学費案内 年間44回プラン 【改定版】.pdf',
        'ベストワン講習学費案内 【改定版】.pdf'
    ];

    let output = '';
    for (const file of files) {
        try {
            output += await processFile(file);
        } catch (e) {
            console.error(`Error processing ${file}:`, e);
            output += `\nError processing ${file}: ${e.message}\n`;
        }
    }

    fs.writeFileSync('ocr_content.txt', output, 'utf8');
    console.log('OCR Complete. Saved to ocr_content.txt');
}

main();
