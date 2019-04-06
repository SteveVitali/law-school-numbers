const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const fs = require('fs');

const url = (username) => encodeURI('http://lawschoolnumbers.com/' + username);

const cycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// True => write each cycle's users to its own JSON file
const WRITE_EACH_CYCLE = false;

// True => write all users from all cycles into one big JSON file
const WRITE_ALL_CYCLES = true;

// If LOG_PROGRESS true, console log every LOG_EVERY_N scraped users 
const LOG_PROGRESS = true;
const LOG_EVERY_N = 100;

// Globals to count number of users processed in current cycle and in total
let userCount = 0;
let totalUserCount = 0;

// Max number of parallel scrape requests for async.each calls
const N_THREADS = 64;

// Load a map mapaping cycle numbers to arrays of incomplete user objects
// that only contain username, GPA, LSAT (scraped from lns/users tables)
const allUsersJson = fs.readFileSync('data/all-users-by-cycle.json');
let allUsersMap = JSON.parse(allUsersJson);
// allUsersMap[16] = allUsersMap[16].splice(6250);

// Global pointing to current cycle number
let cycle = undefined;

// Global containing scraped full user objects for current cycle
let unwrittenUserObjects = [];

// Global containing incompete user objects that need to be re-scraped
let failedUsers = [];

// Global containing ALL scraped full user objects for all cycles
let allUserData = [];

// Logs 'Processed <X> of <Y> users in cycle <C> (<F> failures, <T> total)'
let logProgress = () => {
  totalUserCount += 1;
  userCount += 1;
  if (!(totalUserCount % LOG_EVERY_N) ||
      (userCount + failedUsers.length) === allUsersMap[cycle].length) {
    console.log(
      'Processed', userCount, 'of', allUsersMap[cycle].length,
      'users in cycle', cycle,
      '(' + failedUsers.length + ' failures,', totalUserCount, 'total)'
    );
  }
};

// Scrape full data for given user object
// Add resultant full user data object to global `unwrittenUserObjects`
// If failure, add incomplete user object to global `failedUsers`
let scrapeUserData = ({ username, tag, lsat, gpa }, done) => {
  let userData = { username, tag, lsat, gpa, Applications: [] };
  request(url(username), (err, res, body) => {
    if (err) {
      console.log(err);
      console.log('Error searching for user', username);
      failedUsers.push({ username, tag, lsat, gpa });
      return done(null);
    }
    const $ = cheerio.load(body);

    // Scrape user data points from bottom of page
    // E.g. 'LSDAS GPA', 'LSAT', 'City', 'State', 'Gender', etc.
    $('.lgonbox1').each((i, b) => {
      let box = cheerio.load(b);
      const $label = box('label')[0];
      const $value = box('.view_field')[0];
      const label = $label && $label.children[0].data;
      const value = $value && $value.children[0].data;
      if (label) userData[label.replace(':', '').trim()] = value && value.trim();
    });

    // Scrape user application results list from table
    table = $('table[id=application_tbl]');
    tbody = table.children('tbody');
    rows = tbody.children('tr[class=arow]');
    rows.each((i, tr) => {
      // each `rowData` obj contains school name, result, decision date, etc.
      let rowData = [];
      tr.children.forEach((td, j) => {
        if (td.name !== 'td') return;
        else if (j === 1) rowData.push(cheerio.load(td)('a').first().html());
        else if (!td.children[0]) rowData.push(undefined);
        else rowData.push(td.children[0].data && td.children[0].data.trim());
      });
      userData.Applications.push(rowData);
    });

    if (LOG_PROGRESS) logProgress();
    if (WRITE_ALL_CYCLES) allUserData.push(userData);
    if (WRITE_EACH_CYCLE) unwrittenUserObjects.push(userData);

    done(null);
  });
};


async.eachSeries(cycles,
  (cyc, callback) => {
    // Reset cycle-specific globals
    cycle = cyc;
    userCount = 0;
    failedUsers = [];
    unwrittenUserObjects = [];

    async.eachLimit(allUsersMap[cycle], N_THREADS, scrapeUserData, (err) => {
      console.log('\nScraped non-failed users for cycle', cycle);
      console.log('Num failed users: ', failedUsers.length);
      if (err) console.log(err);

      // While there are failed user-data scrapes, re-scrape those users
      async.whilst(() => failedUsers.length > 0,
        (done) => {
          console.log('\nRe-requesting for failed users', failedUsers, '\n');

          const failedUsersClone = JSON.parse(JSON.stringify(failedUsers));
          failedUsers = [];

          async.eachLimit(failedUsersClone, N_THREADS, scrapeUserData, done);
        },
        (err) => {
          if (err) console.log(err);
          console.log('\nFinished scraping ALL user data for cycle', cycle, '\n');

          if (WRITE_EACH_CYCLE) {
            console.log('Writing full user data for cycle', cycle, '\n');

            const str = JSON.stringify(unwrittenUserObjects);
            fs.writeFile('data/full-user-data-' + cycle + '.json', str, callback);
          }
          else callback(null);
        }
      );
    });
  },
  (err) => {
    if (err) console.log(err);
    console.log('SCRAPED DATA FOR ALL USERS FOR ALL CYCLES');

    if (WRITE_ALL_CYCLES) {
      console.log('\nWriting full user data to full-user-data.json\n');
      fs.writeFile('data/full-user-data.json', JSON.stringify(allUserData), (err) => {
        if (err) console.log(err);
      });
    }
  }
);
