const fs = require('fs');
const path = 'components/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const regexSave = /if \(!department \|\| !batch \|\| !group \|\| !date\) \{[\s\S]*?return;\s*\}/;
const replaceSave = `if ((!department || !batch || !group) && !selectedOffering) {
      showError("Department/Batch/Group OR Subject Offering is required.");
      return;
    }
    if (!date) {
      showError("Date is required.");
      return;
    }`;

if (regexSave.test(code)) {
  code = code.replace(regexSave, replaceSave);
  console.log("saveAttendance patched!");
}

const regexOcr = /if \(!department \|\| !batch \|\| !group \|\| !date \|\| !file\) \{[\s\S]*?return;\s*\}/;
const replaceOcr = `if ((!department || !batch || !group) && !selectedOffering) {
      showError("Subject Offering OR Dept/Batch/Group is required.");
      return;
    }
    if (!date || !file) {
      showError("Select Date and Photo.");
      return;
    }`;

if (regexOcr.test(code)) {
  code = code.replace(regexOcr, replaceOcr);
  console.log("processOCR patched!");
}

fs.writeFileSync(path, code, 'utf8');
