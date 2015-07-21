var AOC = require('./handlers/aoc');

module.exports = [{
  method: 'POST',
  path: '/aoc/api/beta/aoc/in',
  handler: AOC.in
}, {
  method: 'GET',
  path: '/aoc/api/beta/aoc/bbox',
  handler: AOC.bbox
}];
