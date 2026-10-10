const fs = require('fs');
const path = 'components/App.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Remove classEnrollments from App component (so we don't have unused state in App)
code = code.replace(/const \[classEnrollments, setClassEnrollments\] = useState<any\[\]>\(\[\]\);\n/, '');

const enrollFetchRegex = /const enrollmentsResult = await supabase\.from\("class_enrollments"\)\.select\("\*"\);\s*if \(!enrollmentsResult\.error\) \{\s*setClassEnrollments\(enrollmentsResult\.data \|\| \[\]\);\s*\}/;
code = code.replace(enrollFetchRegex, '');

// 2. Add classEnrollments to AttendancePage
const attendancePageStart = /const \[offerings, setOfferings\] = useState<any\[\]>\(\[\]\);/;
if (code.match(attendancePageStart)) {
  code = code.replace(
    attendancePageStart,
    `const [offerings, setOfferings] = useState<any[]>([]);
  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);`
  );
} else {
  console.log("Could not find attendancePageStart.");
}

// 3. Fetch classEnrollments in AttendancePage
const loadOfferingsRegex = /async function loadOfferings\(\) \{\s*const \{ data \} = await supabase\s*\.from\("subject_offerings"\)\s*\.select\("id, class_id, subjects\(name, code\), classes\(name\)"\);\s*if \(data\) setOfferings\(data\);\s*\}/;
const loadOfferingsReplace = `async function loadOfferings() {
      const [offeringsRes, enrollmentsRes] = await Promise.all([
        supabase.from("subject_offerings").select("id, class_id, subjects(name, code), classes(name)"),
        supabase.from("class_enrollments").select("*")
      ]);
      if (offeringsRes.data) setOfferings(offeringsRes.data);
      if (enrollmentsRes.data) setClassEnrollments(enrollmentsRes.data);
    }`;

if (code.match(loadOfferingsRegex)) {
  code = code.replace(loadOfferingsRegex, loadOfferingsReplace);
} else {
  console.log("Could not find loadOfferingsRegex.");
}

fs.writeFileSync(path, code, 'utf8');
console.log("AttendancePage patched!");
