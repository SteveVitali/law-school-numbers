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
  [ 'Georgetown University',    14, 25,    167,    3.76,   19078 ]
];

module.exports = {
  asArray: universities,
  asObject: universities.reduce((obj, uni) => {
    obj[uni[0]] = {
      rank: uni[1],
      rate: uni[2],
      lsat: uni[3],
      gpa: uni[4],
      lsn_apps: uni[5]
    };
    return obj;
  }, {})
};
