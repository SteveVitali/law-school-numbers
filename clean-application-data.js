const fs = require('fs');
const readLine = require('readline');

const t14Map = require('./t14.js').asObject;

const RAW_APPS_PATH = 'data/applications/all-applications.json';
const CLEAN_APPS_PATH = 'data/applications/all-applications-clean.json';
const T14_APPS_PATH = 'data/applications/t14-applications.json';

const dataStream = fs.createReadStream(RAW_APPS_PATH);
const lineReader = readLine.createInterface(dataStream);

const cleanAppsStream = fs.createWriteStream(CLEAN_APPS_PATH);
const t14AppsStream = fs.createWriteStream(T14_APPS_PATH);

let rawCount = 0;
let cleanCount = 0;
let t14Count = 0;

const transformDate = (v) => v === '--' ? undefined : new Date(v);
const transformNaStr = (v) => v.indexOf('N/A') !== -1 ? undefined : v;
const transformNaNum = (v) => v.indexOf('N/A') !== -1 ? undefined : Number(v);
const isYes = (v) => v.indexOf('Yes') !== -1 ? true : undefined;

// Map raw app object key names (descriptions of their values in comments)
// to clean app object key names
const getCleanKey = (key) => ({
  // String; always just the law school name
  'schoolName': { key: 'lawSchool', val: v => v },

  // String; 'Accepted', 'Pending', 'Rejected', 'Waitlisted',
  //         'Intend to Apply', 'WL, Accepted', 'WL, Rejected'
  'status': { key: 'status', val: (v) => (
    v.indexOf('WL') !== -1 ? v.slice(4) : v
  )},

  // Either null or String of the form, e.g., '$60,000'
  'money': { key: 'aid', val: v => (
    v ? Number(v.slice(1).split(',').join('')) : undefined
  )},

  // Either '--' if undefined or String of form 'mm/dd/yy'
  'sent': { key: 'sentDate', val: transformDate },
  'received': { key: 'receivedDate', val: transformDate },
  'complete': { key: 'completeDate', val: transformDate },
  'decision': { key: 'decisionDate', val: transformDate },

  // username String
  'username': { key: 'username', val: v => v },

  // Number of cycle (1 through 16)
  'cycle': { key: 'cycle', val: v => v },

  // Always numerical String
  'lsat': { key: 'lsat', val: v => Number(v) },
  'gpa': { key: 'gpa', val: v => Number(v) },

  // 'N/A' if undefined or numerical String
  'LSAT': { key: 'LSAT', val: transformNaNum },
  'LSDAS GPA': { key: 'lsdasGpa', val: transformNaNum },
  'Degree GPA': { key: 'degreeGpa', val: transformNaNum },
  '*LSAT 1': { key: 'lsat1', val: transformNaNum },
  'LSAT 2': { key: 'lsat2', val: transformNaNum },
  'LSAT 3': { key: 'lsat3', val: transformNaNum },

  // 'N/A' or 'N/A out of N/A' if undefined, or 'X out of Y' otherwise
  'Class Rank': { key: 'classRank', val: transformNaStr },
  // 'N/A' if undefined or String
  'College Name or Type': { key: 'undergradSchool', val: transformNaStr },
  'Major': { key: 'major', val: transformNaStr },
  'City': { key: 'city', val: transformNaStr },
  'State': { key: 'state', val: transformNaStr },
  'Race': { key: 'race', val: transformNaStr },
  'Gender': { key: 'gender', val: transformNaStr },

  // Has values: 'N/A', 'In Undergrad',
  //             '1-2 Years', '3-4 Years', '5-9 Years', '10+ Years'
  'Years out of Undergrad': { key: 'yearsSinceUgrad', val: transformNaStr },

  // 'Yes' if true, otherwise undefined
  'Under Represented Minority': { key: 'isUnderRepresented', val: isYes },
  'Non-Traditional Applicant': { key: 'isNontraditional', val: isYes },
  'International Applicant': { key: 'isInternational', val: isYes }
}[key]);


lineReader.on('line', (line) => {
  rawCount += 1;

  const rawObj = JSON.parse(line);
  let cleanObj = {};

  for (const key in rawObj) {
    const val = rawObj[key];

    // Skip type, updated, tag, *LSDAS GPA, page, and status fields
    if (key === 'type') continue; // all 373k app objs have type=null
    if (key === 'updated') continue; // useless 'last updated' field
    if (key === 'tag') continue; // just shorthand for the boolean fields
    if (key === '*LSDAS GPA') continue; // just copy of 'LSDAS GPA' value
    if (key === 'page') continue; // useless search results page number

    if (key === 'status') {
      // Do not save objects with this status
      if (val === 'Intend to Apply') return;
      // If status is 'WL, Accepted', 'WL, Rejected', or 'Waitlisted',
      // then set waitlisted true (and below set status = accepted/rejected)
      if (val.indexOf('WL') || val === 'Waitlisted') {
        cleanObj.waitlisted = true;
      }
    }

    // Transform raw key/value to 'clean' key/value for clean obj
    const cleanKey = getCleanKey(key).key;
    const cleanVal = getCleanKey(key).val(val);
    cleanObj[cleanKey] = cleanVal;
  }

  cleanAppsStream.write(JSON.stringify(cleanObj) + '\n');
  cleanCount += 1;

  if (cleanObj.lawSchool in t14Map) {
    t14AppsStream.write(JSON.stringify(cleanObj) + '\n');
    t14Count += 1;
  }

  if (rawCount % 10000 === 0) {
    console.log(rawCount, 'raw,', cleanCount, 'clean,', t14Count, 't14');
  }
});


lineReader.on('close', () => {
  cleanAppsStream.end();
  t14AppsStream.end();

  // Wrote 338908 clean apps to data/applications/all-applications-clean.json
  // Wrote 108911 clean t14 apps to data/applications/t14-applications.json
  console.log('Wrote', cleanCount, 'clean apps to', CLEAN_APPS_PATH);
  console.log('Wrote', t14Count, 'clean t14 apps to', T14_APPS_PATH);
});
