const fs = require('fs');
const readLine = require('readline');
const stats = require('stats-lite');

const T14_APPS_PATH = 'data/applications/t14-applications.json';
const JSON_OUT_PATH = 'data/applications/t14-analysis-data.json';
const CSV_OUT_PATH = 'data/applications/t14-analysis-output.csv';

const dataStream = fs.createReadStream(T14_APPS_PATH);
const lineReader = readLine.createInterface(dataStream);

let itemCount = 0;
let dataPointCount = 0;

// { 'All': {
//     'University of Pennsylvania': {
//       'LSAT': {
//         'Cycle 1': {
//           Accepted: [...],
//           Rejected: [...],
//           Waitlisted: [...],
//           Pending: [...],
//           Waitlist Accepted: [...],
//           Waitlist Rejected: [...],
//           All: [...]
//         },
//         ...
//         'Cycle 16': {...},
//         'All Cycles': {...}
//       },
//       'GPA': { 'Cycle 1': { ... }, ... }
//     },
//     ...
//   },
//   'Is International': { ... },
//   'Not Under-Represented': { ... },
//   'Under-Represented': { ... },
//   'Non-Traditioanl Applicant': { ... }
// }
let uniStatsMap = {
  'All': {},
  'International': {},
  'Not Under-Represented': {},
  'Under-Represented': {},
  'Non-Traditional': {}
};

const makeEmptyStatsObj = () => {
  const cycles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  return [ 'LSAT', 'GPA' ].reduce((obj, dp) => {
    obj[dp] = cycles.reduce((child, cyc) => {
      child['Cycle ' + cyc] = {
        All_Decisions: [],
        Accepted: [],
        Rejected: [],
        Waitlisted: [],
        Pending: [],
        Waitlist_Accepted: [],
        Waitlist_Rejected: [],
        Waitlist_Pending: [],
        Waitlist_Waitlisted: []
      };
      return child;
    }, {});
    return obj;
  }, {});
};

lineReader.on('line', (line) => {
  const {
    lawSchool, status, cycle, lsat, gpa, race, isUnderRepresented,
    isNontraditional, isInternational, waitlisted } = JSON.parse(line);

  for (const key in uniStatsMap) {
    if (!uniStatsMap[key][lawSchool]) {
      uniStatsMap[key][lawSchool] = makeEmptyStatsObj();
    }
  }

  const writeItem = (kind, item, cycle, stat, data) => {
    if (data === undefined) return;
    // console.log('uniStatsMap[' + kind + '][' + lawSchool + ']' +
    //  '[' + item + ']' + '[' + cycle + '][' + stat + '] = ' + data);
    uniStatsMap[kind][lawSchool][item][cycle][stat].push(data);
    itemCount += 1;
  };

  const writeItems = (kind, stat) => {
    writeItem(kind, 'GPA', 'Cycle ' + 0, stat, gpa);
    writeItem(kind, 'GPA', 'Cycle ' + cycle, stat, gpa);
    writeItem(kind, 'LSAT', 'Cycle ' + 0, stat, lsat);
    writeItem(kind, 'LSAT', 'Cycle ' + cycle, stat, lsat);
  };

  let kinds = ['All'];
  if (isInternational) kinds.push('International');
  if (isNontraditional) kinds.push('Non-Traditional');
  if (isUnderRepresented) kinds.push('Under-Represented');
  else kinds.push('Not Under-Represented');

  dataPointCount += 1;
  kinds.forEach((kind) => {
    writeItems(kind, status);
    writeItems(kind, 'All_Decisions');
    if (waitlisted) {
      writeItems(kind, 'Waitlist_' + status);
      writeItems(kind, 'All_Decisions');
    }
  });

  if (dataPointCount % 1000 === 0) {
    console.log(itemCount, 'items', 'data point count', dataPointCount);
  }
});

lineReader.on('close', () => {
  console.log('Writing JSON output to', JSON_OUT_PATH);
  fs.writeFileSync(JSON_OUT_PATH, JSON.stringify(uniStatsMap));

  let csvLines = [[
    'set', 'school', 'cycle', 'status',
    'gpa mean', 'gpa 25th', 'gpa 50th', 'gpa 75th',
    'gpa mode', 'gpa variance', 'gpa stdev',
    'lsat mean', 'lsat 25th', 'lsat 50th', 'lsat 75th',
    'lsat mode', 'lsat variance', 'lsat stdev'
  ]];

  for (const appSet in uniStatsMap) {
    for (const school in uniStatsMap[appSet]) {
      for (const cycle in uniStatsMap[appSet][school].LSAT) {
        for (const status in uniStatsMap[appSet][school].LSAT[cycle]) {

          const lsats = uniStatsMap[appSet][school].LSAT[cycle][status];
          const gpas = uniStatsMap[appSet][school].GPA[cycle][status];

          csvLines.push([
            appSet, school, cycle, status,
            stats.mean(gpas), stats.percentile(gpas, 0.25),
            stats.percentile(gpas, 0.5), stats.percentile(gpas, 0.75),
            stats.mode(gpas), stats.variance(gpas), stats.stdev(gpas),
            stats.mean(lsats), stats.percentile(lsats, 0.25),
            stats.percentile(lsats, 0.5), stats.percentile(lsats, 0.75),
            stats.mode(lsats), stats.variance(lsats), stats.stdev(lsats),
          ]);
        }
      }
    }
  }

  console.log('Writing CSV output to', CSV_OUT_PATH);
  let csvString = '';
  csvLines.forEach((line) => {
    console.log(line);
    csvString += line.join(',') + '\n';
  });
  fs.writeFileSync(CSV_OUT_PATH, csvString);
});
