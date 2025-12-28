const fs = require('fs');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('@napi-rs/canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Polyfill NodeCanvasFactory if needed or just patch global
// pdf.js in Node checks for `canvas` module usually. 
// But let's try to pass canvasContext explicitly which we do.

async function renderPageToBuffer(page) {
    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale 
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');

    const renderContext = {
        canvasContext: context,
        viewport: viewport,
        canvasFactory: {
            create: (w, h) => {
                const c = createCanvas(w, h);
                return {
                    canvas: c,
                    context: c.getContext('2d')
                };
            },
            reset: (ctx, w, h) => {
                ctx.canvas.width = w;
                ctx.canvas.height = h;
            },
            destroy: (ctx) => {
                ctx.canvas.width = 0;
                ctx.canvas.height = 0;
                ctx.canvas = null;
                ctx = null;
            }
        }
    };

    await page.render(renderContext).promise;
    return canvas.toBuffer('image/png');
}

async function processFile(file) {
    if (!fs.existsSync(file)) {
        console.log(`File not found: ${file}`);
        return `\nFile not found: ${file}\n`;
    }
    console.log(`Processing ${file}...`);

    const data = new Uint8Array(fs.readFileSync(file));
    const loadingTask = pdfjsLib.getDocument({
        data: data,
        cMapUrl: 'node_modules/pdfjs-dist/cmaps/',
        cMapPacked: true,
        standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/'
    });

    const doc = await loadingTask.promise;
    let fullText = `\n\n=== CONTENT OF ${file} (OCR) ===\n\n`;

    for (let i = 1; i <= doc.numPages; i++) {
        console.log(`  Page ${i}/${doc.numPages}... rendering...`);
        const page = await doc.getPage(i);
        const buffer = await renderPageToBuffer(page);

        console.log(`  Page ${i}/${doc.numPages}... recognizing text...`);
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
