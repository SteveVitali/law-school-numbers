const fs = require('fs');
const readLine = require('readline');

const RAW_APPS_PATH = 'data/applications/all-applications.json';
const CLEAN_APPS_PATH = 'data/applications/all-applications-clean.json';

const dataStream = fs.createReadStream(ALL_APPS_PATH);
const lineReader = readLine.createInterface(dataStream);

let count = 0;

lineReader.on('line', (line) => {
  const appObj = JSON.parse(line);
  if (++count % 10000 === 0) console.log('Processed', count);
});

lineReader.on('close', () => {
  console.log('Writing results to `' + CLEAN_APPS_PATH + '`');
  const keyValStream = fs.createWriteStream(CLEAN_APPS_PATH);
  // keyValStream.write(...)
  keyValStream.end();
});
