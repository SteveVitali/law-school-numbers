const fs = require('fs');
const readLine = require('readline');

const ALL_APPS_PATH = 'data/applications/t14-applications.json';
const KEY_VALUES_PATH = (ext) => (
  'data/applications/t14-application-key-values-counts.' + ext
);

const dataStream = fs.createReadStream(ALL_APPS_PATH);
const lineReader = readLine.createInterface(dataStream);

// Construct map to count number of instances for each value for each key
// { keyName: { val1: count, val2: count, ... }}
let valuesForKeyCount = {};

let count = 0;

lineReader.on('line', (line) => {
  const appObj = JSON.parse(line);
  for (const key in appObj) {
    if (!valuesForKeyCount[key]) valuesForKeyCount[key] = {};
    const val = appObj[key];

    if (!valuesForKeyCount[key][val]) valuesForKeyCount[key][val] = 0;
    valuesForKeyCount[key][val] += 1;
  }
  if (++count % 10000 === 0) console.log('Processed', count);
});

lineReader.on('close', () => {
  console.log('Writing results to `' + KEY_VALUES_PATH('json/txt') + '`');

  // Construct map of keyNames to array of { value, count } objects
  // such that the array of value/count objects is sorted desc by count
  let keyValuesSorted = {};
  for (const key in valuesForKeyCount) {
    let valueCountObjs = [];
    for (const val in valuesForKeyCount[key]) {
      valueCountObjs.push({ val: val, count: valuesForKeyCount[key][val] });
    }
    keyValuesSorted[key] = valueCountObjs.sort((a, b) => (
      a.count === b.count ? 0 : (a.count > b.count ? -1 : 1)
    ));
  }
  // Write for each application object key the list of possible values that
  // it takes on in the dataset, sorted desc by their frequency
  const keyValStream = fs.createWriteStream(KEY_VALUES_PATH('txt'));
  for (key in keyValuesSorted) {
    keyValStream.write('KEY: ' + key + '\n');
    keyValuesSorted[key].forEach(({ val, count }) => {
      keyValStream.write('  ' + count + ':\t' + val + '\n');
    });
    keyValStream.write('\n\n');
  }
  keyValStream.end();

  // Write JSON version, too
  fs.writeFileSync(KEY_VALUES_PATH('json'), JSON.stringify(keyValuesSorted));
});
