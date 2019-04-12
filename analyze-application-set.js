const fs = require('fs');
const readLine = require('readline');
const stats = require('stats-lite');
const moment = require('moment');

const T14_APPS_PATH = 'data/applications/t14-applications.json';
const JSON_OUT_PATH = 'data/applications/t14-analysis-data.json';
const CSV_OUT_PATH = 'data/applications/t14-analysis-output.csv';

const STAT_FIELDS = ['lsat', 'gpa', 'sentDate', 'decisionDate'];

const dataStream = fs.createReadStream(T14_APPS_PATH);
const lineReader = readLine.createInterface(dataStream);

let itemCount = 0;
let dataPointCount = 0;

// { 'All': {
//     'University of Pennsylvania': {
//       'lsat': {
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
//       'gpa': { 'Cycle 1': { ... }, ... },
//       'sentDate': { ... },
//       'decisionDate': { ... }
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
  return STAT_FIELDS.reduce((obj, dp) => {
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
  let appObj = JSON.parse(line);

  appObj.sentDate = appObj.sentDate
    ? (new Date(appObj.sentDate)).getTime() : undefined;

  appObj.decisionDate = appObj.decisionDate
    ? (new Date(appObj.decisionDate)).getTime() : undefined;

  let {
    lawSchool, status, cycle, lsat, gpa, race, isUnderRepresented,
    sentDate, decisionDate,
    isNontraditional, isInternational, waitlisted } = appObj;

  for (const key in uniStatsMap) {
    if (!uniStatsMap[key][lawSchool]) {
      uniStatsMap[key][lawSchool] = makeEmptyStatsObj();
    }
    if (!uniStatsMap[key]['All T14']) {
      uniStatsMap[key]['All T14'] = makeEmptyStatsObj();
    }
  }

  const writeItem = (kind, item, cycle, status, data) => {
    if (data === undefined) return;
    // console.log('uniStatsMap[' + kind + '][' + lawSchool + '][' +
      // item + ']' + '[' + cycle + '][' + status + '].push(' + data + ')');
    uniStatsMap[kind][lawSchool][item][cycle][status].push(data);
    uniStatsMap[kind]['All T14'][item][cycle][status].push(data);
    itemCount += 1;
  };

  const writeItems = (kind, stat) => {
    STAT_FIELDS.forEach((field) => {
      writeItem(kind, field, 'Cycle ' + 0, stat, appObj[field]);
      writeItem(kind, field, 'Cycle ' + cycle, stat, appObj[field]);
    });
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
    'set', 'school', 'cycle', 'status', 'count',

    'gpa mean', 'gpa 25th', 'gpa 50th', 'gpa 75th',
    'gpa mode', 'gpa variance', 'gpa stdev',

    'lsat mean', 'lsat 25th', 'lsat 50th', 'lsat 75th',
    'lsat mode', 'lsat variance', 'lsat stdev',

    'sent mean', 'sent 25th', 'sent 50th', 'sent 75th',
    'sent mode', 'sent stdev (days)',

    'decision mean', 'decision 25th', 'decision 50th', 'decision 75th',
    'decision mode', 'decision stdev (days)',
  ]];

  const p25 = (list) => stats.percentile(list, 0.25);
  const p50 = (list) => stats.percentile(list, 0.50);
  const p75 = (list) => stats.percentile(list, 0.75);

  const msToDays = (ms) => moment.duration(ms).asDays();
  const msToString = (d) => moment(new Date(d)).format('MM/DD/YYYY');

  for (const appSet in uniStatsMap) {
    for (const school in uniStatsMap[appSet]) {
      for (const cycle in uniStatsMap[appSet][school].lsat) {
        for (const status in uniStatsMap[appSet][school].lsat[cycle]) {

          const lsats = uniStatsMap[appSet][school].lsat[cycle][status];
          const gpas = uniStatsMap[appSet][school].gpa[cycle][status];
          const sents = uniStatsMap[appSet][school].sentDate[cycle][status];
          const decs = uniStatsMap[appSet][school].decisionDate[cycle][status];

          const cyc = cycle === 'Cycle 0' ? 'All Cycles' : cycle;

          csvLines.push([
            appSet, school, cyc, status, lsats.length,

            stats.mean(gpas), stats.percentile(gpas, 0.25),
            stats.percentile(gpas, 0.5), stats.percentile(gpas, 0.75),
            stats.mode(gpas), stats.variance(gpas), stats.stdev(gpas),

            stats.mean(lsats), stats.percentile(lsats, 0.25),
            stats.percentile(lsats, 0.5), stats.percentile(lsats, 0.75),
            stats.mode(lsats), stats.variance(lsats), stats.stdev(lsats),

            msToString(stats.mean(sents)),
            msToString(p25(sents)), msToString(p50(sents)), msToString(p75(sents)),
            msToString(stats.mode(sents)), msToDays(stats.stdev(sents)),

            msToString(stats.mean(decs)),
            msToString(p25(decs)), msToString(p50(decs)), msToString(p75(decs)),
            msToString(stats.mode(decs)), msToDays(stats.stdev(decs))
          ]);
        }
      }
    }
  }

  console.log('Writing CSV output to', CSV_OUT_PATH);

  let csvString = '';
  csvLines.forEach((line) => csvString += line.join(',') + '\n');

  fs.writeFileSync(CSV_OUT_PATH, csvString);
});
