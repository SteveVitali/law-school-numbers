var fs = require('fs');

const cycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// Load all users into map by cycle
const cycleUsersMap = {};
cycles.forEach((cycle) => {
  const path = 'data/users-for-cycle-by-page-' + cycle +'.json';
  cycleUsersMap[cycle] = JSON.parse(fs.readFileSync(path));
});

// For given user in given cycle, look up in JSON which
// search results page they were on
const findPageOfUserInCycle = ({ username }, cycle) => {
  let userPage = undefined;
  for (page in cycleUsersMap[cycle]) {
    cycleUsersMap[cycle][page].forEach((userObj) => {
      if (userObj.username === username) {
        return userPage = page; 
      }
    });
  }
  return userPage;
};

let allUsers = [];

let failedUsersMap = {};
let totalFailures = 0;
let totalSuccesses = 0;

cycles.forEach((cycle) => {
  const json = fs.readFileSync('data/full-user-data-' + cycle + '.json');
  let users = JSON.parse(json);
  users.forEach((user) => {
    // 'LSDAS GPA' and 'LSAT' are key data points scraped from user pages
    // (as opposed to the user search results table that gave us usernames)
    // If these properties don't exist, it means in 99% of cases that the
    // url to the user profile is broken, or the user no longer exists.
    let page = findPageOfUserInCycle(user, cycle);
    if (!user['LSDAS GPA'] || !user.LSAT) {
      if (!failedUsersMap[cycle]) failedUsersMap[cycle] = {};
      if (!failedUsersMap[cycle][page]) failedUsersMap[cycle][page] = [];
      failedUsersMap[cycle][page].push(user.username);
      totalFailures += 1;
      user.scrapeFailed = true;
    }
    else {
      totalSuccesses += 1;
    }
    user.page = page;
    user.cycle = cycle;

    // Convert application array items to objects
    user.applicationsMap = {};
    user.Applications.forEach((app) => {
      if (!app[0]) return;

      let uniName = app[0];
      let carIndex = uniName.indexOf('<');
      // This means that a "<span>" after the uni name got accidentally scraped
      // and included as part of the uni name. Here we slice that part off
      if (carIndex >= 0) {
        console.log('slicing', uniName);
        uniName = uniName.slice(0, carIndex);
        console.log('into _' + uniName + '_');
      }
      uniName = uniName.trim();

      user.applicationsMap[uniName] = {
        status: app[1],
        type: app[2],
        money: app[3],
        sent: app[4],
        received: app[5],
        complete: app[6],
        decision: app[7],
        updated: app[8]
      };
    });
    delete user['Applications'];
    allUsers.push(user);
  });
  console.log('Processed', users.length, 'users in cycle', cycle);
});

console.log('Sanity-checked all', cycles.length, 'cycles');

// RESULTS: found 197 failures (and 85,816 successes)
// It appears that the user data probably exists, but the links to their
// full profile data somehow do not work because of the unusual
// characters (periods, pound signs, at signs, etc.) in their names
console.log(failedUsersMap);
console.log(totalFailures, 'failures,', totalSuccesses, 'successes');

fs.writeFile('data/all-users-data.json', JSON.stringify(allUsers), (err) => {
  if (err) console.log(err);
  console.log('WROTE FULL USER DATA FOR ALL USERS');
});
