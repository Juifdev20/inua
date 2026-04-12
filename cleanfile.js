const fs = require('fs');
const path = require('path');

const file = 'C:/Users/dieud/Desktop/Inua/hospital-backend/src/main/java/com/hospital/backend/controller/DoctorChatController.java';

let content = fs.readFileSync(file);

// Remove BOM if present (EF BB BF)
if (content[0] === 0xEF && content[1] === 0xBB && content[2] === 0xBF) {
    content = content.slice(3);
    console.log('BOM found and removed');
}

// Write back as UTF-8 without BOM
fs.writeFileSync(file, content);
console.log('File cleaned successfully');
