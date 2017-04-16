var fetch = require('node-fetch');
var fs = require('fs');
var Nightmare = require('nightmare');

require('dotenv').config()

var WAIT = 5000;
var SHOW = false;

var endDate = new Date();
// Clarity shows only 5 daily charts per page
var firstPeriod = [
  new Date(endDate - 5 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10),
  endDate.toISOString().substr(0, 10),
];
var secondPeriod = [
  new Date(endDate - 7 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10),
  new Date(endDate - 5 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10),
];

var xvfb;
function startFb() {
  if (process.platform.indexOf('linux') !== -1) {
    var Xvfb = require('xvfb');
    xvfb = new Xvfb({
      silent: true
    });
    xvfb.startSync();
  }
}
function stopFb() {
  if (process.platform.indexOf('linux') !== -1) {
    xvfb.stopSync();
  }
}

startFb();

var nightmare = Nightmare({show: SHOW});
nightmare
  .goto('https://clarity.dexcom.com/')
  .click('a[href="/users/auth/dexcom_sts"]')
  .wait(WAIT)
  .insert('input[name=username]', process.env.CLARITY_USERNAME)
  .insert('input[name=password]', process.env.CLARITY_PASSWORD)
  .click('input[type=submit]')
  .wait(WAIT)
  .goto('https://clarity.dexcom.com/#/data/daily?dates=' + firstPeriod[0] + '%2F' + firstPeriod[1])
  .wait(WAIT)
  .evaluate(function() {
    var charts = Array.prototype.map.call(
      document.querySelectorAll('daily-strip-chart'),
      function(el) { return el.outerHTML; }
    );
    var cssUrls = Array.prototype.map.call(
      document.querySelectorAll('link[rel=stylesheet]'),
      function(el) { return el.href; }
    )
    return [charts, cssUrls];
  })
  .then(function(chartsAndCssUrls) {
    nightmare
      .goto('https://clarity.dexcom.com/#/data/daily?dates=' + secondPeriod[0] + '%2F' + secondPeriod[1])
      .wait(WAIT)
      .evaluate(function() {
        return Array.prototype.map.call(
          document.querySelectorAll('daily-strip-chart'),
          function(el) { return el.outerHTML; }
        );
      })
      .then(function(pageTwoCharts) {
        nightmare.end().then(function() {});

        var allCharts = chartsAndCssUrls[0].concat(pageTwoCharts);
        var cssUrls = chartsAndCssUrls[1];

        var cssFetches = cssUrls.map(function(url) {
          return fetch(url).then(function(res) { return res.text(); })
        });
        Promise.all(cssFetches).then(function(csses) {
          makeCharts(allCharts, csses.join('\n'));
        });
      })
  })

function makeCharts(charts, cssContent) {
  var chartScreenshots = charts.map(function(chartHtml, i) {
    var html = [
      '<html>',
      '<head><style>' + cssContent + '</style></head>',
      '<body style="background: white">',
      chartHtml,
      '</body>',
      '</html>',
    ].join('');
    var screenshotFile = '/tmp/chart-' + i + '.png';
    return Nightmare({show: SHOW})
      .viewport(855, 290)
      .goto('data:text/html,' + html)
      .screenshot(screenshotFile)
      .end()
      .then(function() {
        return [i, screenshotFile];
      });
  });
  Promise.all(chartScreenshots).then(function(chartFiles) {
    stopFb();
    stitchChartPngs(chartFiles);
  });
}

function stitchChartPngs(chartFiles) {
  chartFiles.sort(function(a, b) { return a[0] - b[0]; });
  var html = chartFiles.map(function(indexAndFile) {
    var base64 = new Buffer(fs.readFileSync(indexAndFile[1])).toString('base64');
    return '<img src="data:image/gif;base64,' + base64 + '"><br>';
  }).join('\n');
  console.log(html);
}
