const fs = require('fs');
const _ = require('lodash');

const universities = require('')

const allUsers = JSON.parse(fs.readFileSync('data/all-users-data.json'));

const UNI_APPS_PATH = (uni) => 'data/applications/' + uni + '.json';
const ALL_APPS_PATH = 'data/applications/all-applications.json';

const universityMap = require('./t14.js').asObject;

// Map uni names to 'Application' objects containing application data
// and user data in one object
let uniToAppMap = {};
let totalApps = 0;

allUsers.forEach((user) => {
  for (uni in user.applicationsMap) {
    if (!uniToAppMap[uni]) uniToAppMap[uni] = [];
    let uniObj = _.extend({}, user.applicationsMap[uni]);
    let userObjWithoutApps = _.omit(user, ['applicationsMap']);
    uniObj = _.extend(uniObj, userObjWithoutApps);
    uniToAppMap[uni].push(uniObj);
    totalApps += 1;
  }
});

// For the top schools, write their 'Application' objects to a JSON file
for (uni in universityMap) {
  console.log(uni, 'has', uniToAppMap[uni].length, 'applications\n');
  fs.writeFileSync(UNI_APPS_PATH(uni), JSON.stringify(uniToAppMap[uni]));
}

console.log('Now write all', totalApps, 'to', ALL_APPS_PATH);

// Wipe the all-applications.json file and open write stream
// (because too much data to write all at once)
fs.writeFileSync(ALL_APPS_PATH, '');
const allAppsStream = fs.createWriteStream(ALL_APPS_PATH, { flags:'a' });

// For each uni, append its application objects to all-applications.json
for (uni in uniToAppMap) {
  uniToAppMap[uni].forEach((uniObj) => {
    const lineItem = JSON.stringify(_.extend({ schoolName: uni }, uniObj));
    allAppsStream.write(lineItem + '\n');
  });
}

allAppsStream.end();
