const puppeteer = require('puppeteer');
const restify = require('restify');
const ip_addr = '127.0.0.1';
const port = '8080';

var server = restify.createServer({
  name: 'printapi'
});

server.listen(port, ip_addr, function() {
  console.log('%s listening at %s ', server.name, server.url);
});

PATH = '/print';
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({ requestBodyOnGet: true }));
server.post({ path: PATH, version: '0.0.1' }, postNewPrintJob);

function postNewPrintJob(req, res, next) {
  console.log(req.body);

  var job = {};
  //    job.title = req.params.title;
  //    job.description = req.params.description;
  job.location = req.params.location;
  job.filename = req.params.filename;
  job.postedOn = new Date();

  console.log(job);
  res.setHeader('Access-Control-Allow-Origin', '*');

  (async () => {
    console.log(job);
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(job.location, { waitUntil: 'load' });
    await page.emulateMedia('print');
    const pdffile = await page.pdf({
      path: job.filename,
      format: 'A4',
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });

    browser.close();

    if (pdffile) {
       
      res.send(200, pdffile);
      return next();
    }
    return next(err);
  })();
}
