const pdf = require('pdf-parse');
console.log('Type of pdf:', typeof pdf);
console.log('pdf:', pdf);
try {
    const defaultPdf = pdf.default;
    console.log('Type of pdf.default:', typeof defaultPdf);
} catch (e) { }
