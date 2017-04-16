require('dotenv').config()

var cloudinary = require('cloudinary');
var fetch = require('node-fetch');
var fs = require('fs');
var moment = require('moment');
var Nightmare = require('nightmare');

var WAIT = 5000;
var SHOW = false;

var endDate = new Date();
var dateRangeStrings = [
  moment(endDate).subtract(7, 'days').format('MM/DD/YYYY'),
  moment(endDate).format('MM/DD/YYYY'),
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
  .goto(process.env.NIGHTSCOUT_HOST + '/report/index.html')
  .wait(WAIT)
  .type('#rp_from', dateRangeStrings[0])
  .type('#rp_to', dateRangeStrings[1])
  .uncheck('#rp_optionsnotes')
  .click('#rp_show')
  .wait(WAIT * 2)
  .evaluate(function() {
    var charts = Array.prototype.map.call(
      document.querySelectorAll('#daytodaycharts > table'),
      function(el) { return el.outerHTML; }
    );
    var cssUrls = Array.prototype.map.call(
      document.querySelectorAll('link[rel=stylesheet]'),
      function(el) { return el.href; }
    )
    return [charts, cssUrls];
  }).then(function(chartsAndCssUrls) {
    nightmare.end().then(function() {});

    var charts = chartsAndCssUrls[0];
    var cssUrls = chartsAndCssUrls[1];

    var cssFetches = cssUrls.map(function(url) {
      return fetch(url).then(function(res) { return res.text(); })
    });

    Promise.all(cssFetches)
      .then(function(csses) {
        return makeChartPngs(charts, csses.join('\n'));
      })
      .then(uploadChartPngs)
      .then(makeHtml);
  })

function makeChartPngs(charts, cssContent) {
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
      .viewport(1300, 550)
      .goto('data:text/html,' + html)
      .screenshot(screenshotFile)
      .end()
      .then(function() {
        return screenshotFile;
      });
  });
  return Promise.all(chartScreenshots).then(function(chartFiles) {
    stopFb();
    return chartFiles;
  });
}

function uploadChartPngs(chartFiles) {
  var uploads = chartFiles.map(function(chartFile) {
    return new Promise(function(resolve, reject) {
      cloudinary.uploader.upload(
        chartFile,
        function(result) { resolve(result); },
        {transformation: {width: 0.75, crop: "scale"}}
      );
    }).then(function(result) {
      return result['secure_url'];
    });
  });
  return Promise.all(uploads);
}

function makeHtml(uploadUrls) {
  var html = uploadUrls.map(function(uploadUrl) {
    return '<img src="' + uploadUrl+ '"><br>';
  }).join('\n');
  console.log(html);
}
