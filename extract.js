const fs = require('fs');
const pdfParse = require('pdf-parse');

const buf = fs.readFileSync('/Users/halilaslan/Downloads/C blok 27.pdf');
pdfParse(buf).then(data => {
  console.log(data.text);
}).catch(console.error);
