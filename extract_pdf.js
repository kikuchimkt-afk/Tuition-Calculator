const fs = require('fs');
const pdf = require('pdf-parse');

const files = [
    'ベストワン学費案内 年間44回プラン 【改定版】.pdf',
    'ベストワン講習学費案内 【改定版】.pdf'
];

async function readPdf(file) {
    try {
        if (!fs.existsSync(file)) {
            return `\n\nFile not found: ${file}\n`;
        }
        const dataBuffer = fs.readFileSync(file);
        const data = await pdf(dataBuffer);
        return `\n\n=== CONTENT OF ${file} ===\n\nMetadata: ${JSON.stringify(data.info)}\nPages: ${data.numpages}\nText Length: ${data.text.length}\n\n${data.text}`;
    } catch (e) {
        return `\n\nError reading ${file}: ${e.message}\n`;
    }
}

async function main() {
    let output = '';
    for (const file of files) {
        output += await readPdf(file);
    }
    fs.writeFileSync('pdf_content.txt', output, 'utf8');
}

main();
