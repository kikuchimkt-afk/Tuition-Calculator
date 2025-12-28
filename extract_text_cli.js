const { execSync } = require('child_process');
const fs = require('fs');

const files = [
    'ベストワン学費案内 年間44回プラン 【改定版】.pdf',
    'ベストワン講習学費案内 【改定版】.pdf'
];

let output = '';

for (const file of files) {
    try {
        console.log(`Processing ${file}...`);
        // Note: execSync returns buffer, we convert to string.
        // We need to quote the filename.
        const cmd = `node node_modules/pdf-parse/bin/cli.mjs text "${file}"`;
        const result = execSync(cmd, { encoding: 'utf8' });
        output += `\n\n=== CONTENT OF ${file} ===\n\n${result}`;
    } catch (e) {
        output += `\n\nError processing ${file}: ${e.message}\n`;
    }
}

fs.writeFileSync('pdf_content_utf8.txt', output, 'utf8');
console.log('Done.');
