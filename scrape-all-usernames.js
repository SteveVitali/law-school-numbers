const request = require('request');
const cheerio = require('cheerio');
const async = require('async');
const fs = require('fs');

const url = (cycle, page) => (
  'http://search.lawschoolnumbers.com/users/profiles?' +
  'DGPA_Slider_val=1.00+-+4.33&LGPA_Slider_val=1.00+-+4.33' +
  '&LSAT_Slider_val=120+-+180&_=1554260578944&commit=Search+Applicants' +
  '&cycle_id=' + cycle +
  '&international=Included&location=&location_s=Any&major=&major_s=Any' + 
  '&mlast=Included&nontr=Included' +
  '&page=' + page +
  '&race=&race_s=Any&school_type=&school_type_s=Any&sex=Any' +
  '&state%5Bstate_s%5D=Any&urm=Included&utf8=%E2%9C%93'
);

const cycles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
let cycleMap = {};
let usersMap = {};

async.each(cycles, (cycle, callback) => {

  let isLastPage = false;
  let page = 1;

  async.whilst(
    () => !isLastPage,
    (done) => {
      request(url(cycle, page), (err, res, body) => {
        if (err) return console.log(err);

        const $ = cheerio.load(body);
        table = $('table[class=scllist]');
        rows = table.children('tbody');
        children = rows.children('tr[class=row]');

        let users = []

        if (children.first().children().length < 4) {
          isLastPage = true;
          return done(null, page);
        }

        rows.children('tr[class=row]').each((i, tr) => {
          let user = {}
          tr.children.forEach((td, j) => {
            if (td.name !== 'td' || !td.children[0]) return;
            else if (j === 1) {
              user.username = td.children[0].children[0].data;
              user.tag = td.children[2].children[0].data;
            }
            else if (j === 3) user.lsat = td.children[0].data;
            else if (j === 5) user.gpa = td.children[0].data
          });
          users.push(user);
        });
        // console.log(users.length, 'users for cycle', cycle, 'page', page)

        if (!cycleMap[cycle]) cycleMap[cycle] = {};
        if (!usersMap[cycle]) usersMap[cycle] = [];
        cycleMap[cycle][page] =  users;
        usersMap[cycle] = usersMap[cycle].concat(users);
        page += 1;
        done(null);
      });
    },
    (err) => {
      console.log('\nWriting data for cycle', cycle, '\n');
      fs.writeFile(
        'data/users-for-cycle-' + cycle + '.json',
        JSON.stringify(usersMap[cycle]),
        (err) => {
          err && console.log(err);
          fs.writeFile(
            'data/users-for-cycle-by-page-' + cycle + '.json',
            JSON.stringify(cycleMap[cycle]),
            callback
          );
        }
      );
    }
  );
}, (err) => {
  if (err) return console.log(err);
  console.log('Finished writing all data for cycles', cycles, '!');
  console.log('Now write same data all to one file: all-users-by-cycle.json');

  fs.writeFile(
    'data/all-users-by-cycle.json',
    JSON.stringify(usersMap),
    (err) => err && console.log(err)
  );
});
