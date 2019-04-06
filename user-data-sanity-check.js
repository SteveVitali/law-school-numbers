var fs = require('fs');

const cycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// For given user in given cycle, look up in JSON which
// search results page they were on
const findPageOfUserInCycle = ({ username }, cycle) => {
  const path = 'data/users-for-cycle-by-page-' + cycle +'.json';
  const cycleUsers = JSON.parse(fs.readFileSync(path));
  let userPage = undefined;
  for (page in cycleUsers) {
    cycleUsers[page].forEach((userObj) => {
      if (userObj.username === username) {
        return userPage = page; 
      }
    });
  }
  return userPage;
};

let failedUsersMap = {};
let totalFailures = 0;
let totalSuccesses = 0;

cycles.forEach((cycle) => {
  const json = fs.readFileSync('data/full-user-data-' + cycle + '.json');
  const users = JSON.parse(json);
  users.forEach((user) => {
    // 'LSDAS GPA' and 'LSAT' are key data points scraped from user pages
    // (as opposed to the user search results table that gave us usernames)
    // If these properties don't exist, it means in 99% of cases that the
    // url to the user profile is broken, or the user no longer exists.
    if (!user['LSDAS GPA'] || !user.LSAT) {
      if (!failedUsersMap[cycle]) failedUsersMap[cycle] = {};
      let page = findPageOfUserInCycle(user, cycle);
      if (!failedUsersMap[cycle][page]) failedUsersMap[cycle][page] = [];
      failedUsersMap[cycle][page].push(user.username);
      totalFailures += 1;
    }
    else totalSuccesses += 1;
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
