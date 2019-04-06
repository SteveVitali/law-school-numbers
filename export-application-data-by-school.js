const fs = require('fs');
const _ = require('lodash');

const allUsers = JSON.parse(fs.readFileSync('data/all-users-data.json'));

const universities = [
  [ 'Yale University',  1,  10,    173,    3.93,   6548 ],
  [ 'Harvard University',   2,  18,    173,    3.86,   13292 ],
  [ 'Stanford University',  2,  11,    171,    3.89,   9143 ],
  [ 'University of Chicago',    4,  22,    170,    3.9,    11342 ],
  [ 'Columbia University',  4,  2, 171,    3.7,    15407 ],
  [ 'New York University',  6,  33, 169,    3.78,   14728 ],
  [ 'University of Pennsylvania',   7,  19,    169,    3.89,   13177 ],
  [ 'University of Michigan Ann Arbor', 8,  28,    168,    3.76,   13600 ],
  [ 'University of Virginia',   8,  20, 168,    3.86,   14457 ],
  [ 'University of California Berkeley',    8,  21,    166,    3.78,   12903 ],
  [ 'Duke University',  11, 23, 169,    3.76,   13702 ],
  [ 'Northwestern University',  12, 23,    168,    3.77,   10341 ],
  [ 'Cornell University',   13, 31,    167,    3.74,   11210 ],
  [ 'Georgetown University',    14, 25,    167,    3.76,   19078 ],
  [ 'University of Texas Austin',   15, 22,    167,    3.73,   8887 ],
  [ 'Vanderbilt University',    16, 38, 166,    3.74,   9462 ],
  [ 'University of California Los Angeles', 17, 30,    166,    3.74,   12037 ],
  [ 'Washington University in St Louis',    18, 28,    167,    3.67,   8278 ],
  [ 'University of Southern California',    19, 30,    166,    3.76,   9201 ]
];

universityMap = {};
universities.forEach((uni) => {
  universityMap[uni[0]] = {
    rank: uni[1],
    rate: uni[2],
    lsat: uni[3],
    gpa: uni[4],
    lsn_apps: uni[5]
  };
});

// Map uni names to 'Application' objects containing application data
// and user data in one object
uniToAppMap = {};

allUsers.forEach((user) => {
  for (uni in user.applicationsMap) {
    if (!uniToAppMap[uni]) uniToAppMap[uni] = [];
    let uniObj = _.extend({}, user.applicationsMap[uni]);
    let userObjWithoutApps = _.omit(user, ['applicationsMap']);
    uniObj = _.extend(uniObj, userObjWithoutApps);
    uniToAppMap[uni].push(uniObj);
  }
});

// For the top schools, write their 'Application' objects to a JSON file
for (uni in universityMap) {
  console.log(uni, 'has', uniToAppMap[uni].length, 'applications\n');
  fs.writeFileSync(
    'data/applications/' + uni + '.json',
    JSON.stringify(uniToAppMap[uni]));
}
