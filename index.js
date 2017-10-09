// 引入puppeteer和restify
const puppeteer = require('puppeteer');
const restify = require('restify');
var path = require('path');
const fs = require('fs');
const merge = require('easy-pdf-merge');
const pdfinputdirectory = 'PDFSingleFiles';
const pdfoutputdirectory = 'pdffiles';
const pdffiledirectory = __dirname + '\\' + pdfinputdirectory;
const uuid = require('node-uuid');
let outputfilepath = '';
//指定Server的IP地址和端口
const ip_addr = '127.0.0.1';
const port = '8080';

//启动Server
var server = restify.createServer({
  name: 'Batch-Print-Server'
});

//启动服务端监听
server.listen(port, ip_addr, function () {
  console.log('%s listening at %s ', server.name, server.url);
});

//启用restify的插件
server.use(restify.plugins.queryParser());
server.use(
  restify.plugins.bodyParser({
    requestBodyOnGet: true
  })
);
// server.use(restify.pre.userAgentConnection());
// Lets try and fix CORS support
// By default the restify middleware doesn't do much unless you instruct
// it to allow the correct headers.
//
// See issues:
// https://github.com/mcavage/node-restify/issues/284 (closed)
// https://github.com/mcavage/node-restify/issues/664 (unresolved)
//
// What it boils down to is that each client framework uses different headers
// and you have to enable the ones by hand that you may need.
// The authorization one is key for our authentication strategy
//
let ALLOW_HEADERS = [];
ALLOW_HEADERS.push('authorization');
ALLOW_HEADERS.push('withcredentials');
ALLOW_HEADERS.push('x-requested-with');
ALLOW_HEADERS.push('x-forwarded-for');
ALLOW_HEADERS.push('x-real-ip');
ALLOW_HEADERS.push('x-customheader');
ALLOW_HEADERS.push('user-agent');
ALLOW_HEADERS.push('keep-alive');
ALLOW_HEADERS.push('host');
ALLOW_HEADERS.push('accept');
ALLOW_HEADERS.push('connection');
ALLOW_HEADERS.push('upgrade');
ALLOW_HEADERS.push('content-type');
ALLOW_HEADERS.push('dnt'); // Do not track
ALLOW_HEADERS.push('if-modified-since');
ALLOW_HEADERS.push('cache-control');

// Manually implement the method not allowed handler to fix failing preflights
//

server.use(function crossOrigin(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Connection,Origin,Accept,X-Requested-With,content-type'
  );
  return next();
});
server.on('MethodNotAllowed', function (request, response) {
  if (
    request.method.toUpperCase() === 'OPTIONS' ||
    'POST' ||
    'GET' ||
    'DELETE' ||
    'PUT'
  ) {
    // Send the CORS headers
    //
    response.header('Access-Control-Allow-Credentials', true);
    response.header('Access-Control-Allow-Headers', ALLOW_HEADERS.join(', '));
    response.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    response.header('Access-Control-Allow-Origin', request.headers.origin);
    response.header('Access-Control-Max-Age', 0);
    response.header('Content-type', 'application/json charset=UTF-8');
    response.header('Content-length', 0);

    response.send(204);
  } else {
    response.send(new restify.MethodNotAllowedError());
  }
});
//指定根路由返回内容
server.get('/', function (req, res, next) {
  res.send('Hello BatchPrint!');
  return next();
});
// testing the service
server.post('/test', testhello);


async function testhello(req, res, next) {
  const postdata = JSON.parse(req.body);
  console.log(postdata.length);
  const jobs = postdata;
  await jobs.forEach(async job => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(job.printpage, {
      waitUntil: 'networkidle',

      networkIdleTimeout: 20000
    })
    await page.pdf({
      path: __dirname + '\\pdffiles\\' + job.docname + jobs.indexOf(job) + '.pdf',
      format: 'A4',
      margin: {
        top: '10mm',
        bottom: '10mm',
        left: '10mm',
        right: '10mm'
      }
    });
    await browser.close();
    console.log(job.printpage + job.docname);
  });
  await console.info('foreach pdf end!');
  // let filelist=[];
  // fs.watch(__dirname + '\\pdffiles\\', {
  //       persistent: false, // 设为false时，不会阻塞进程。
  //       recursive: false
  //     }, (eventType, filename) => {
  //  if(eventType==='change'){
  //      if (filename) {
  //         filelist.push({
  //           filename: filename,
  //         })
  //      } else {
  //        console.log('未提供文件名');
  //      }
  //   }
  //   console.log(filelist);
  // });
  next();

}
server.get(
  /\/download\/?.*/,
  restify.plugins.serveStatic({
    directory: './pdffiles/',
    default: 'index.html',
    appendRequestPath: false
  })
);
//指定Route
PATH = '/print';
//指定相应Route的方法
server.post({
    path: PATH,
    version: '0.0.1'
  },
  postNewPrintJob
);



function postNewPrintJob(req, res, next) {
  const printjobs = req.body;

  if (printjobs == null || printjobs == undefined || printjobs.length <= 0)
    return;
  var singlefiles = [];
  puppeteer.launch().then(async browser => {
    console.info('---export to pdf start at %s-----', new Date());
    console.info('---file count:%s', printjobs.length);
    var currentjobid = uuid.v4();
    const currentjobdirectory = pdffiledirectory + '\\' + currentjobid;
    fs.mkdirSync(currentjobdirectory);

    let filelist = [];
    for (let i = 0; i < printjobs.length; i++) {
      //新建Page
      const page = await browser.newPage();
      //打开页面 load方式指页面所有事务执行完毕
      await page.goto(printjobs[i].printpage, {
        waitUntil: 'networkidle',

        networkIdleTimeout: 20000
      });

      //指定响应Media为Print
      await page.emulateMedia('print');
      //生成PDF文件，format设为A4,margin为默认页边距。
      const filebuffer = await page.pdf({
        path: currentjobdirectory + '\\' + printjobs[i].docname + '.pdf',
        format: 'A4',
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        }
      });
      console.info(
        '---file %s was finished at %s---',
        printjobs[i].docname + '.pdf',
        new Date()
      );
      filelist.push({
        index: i,
        filename: printjobs[i].docname + '.pdf',
        path: currentjobdirectory + '\\' + printjobs[i].docname + '.pdf'
      });
    }
    //关闭浏览器。
    await browser.close();
    console.info('---export to pdf end -----');
    console.log(filelist);
    let tomergefiles = [];
    fs.readdirSync(currentjobdirectory).forEach(file => {
      tomergefiles.push(currentjobdirectory + '\\' + file);
    });
    console.log(tomergefiles);
    outputfilepath =
      __dirname + '\\' + pdfoutputdirectory + '\\' + currentjobid + '.pdf';
    if (tomergefiles.length < 2) {
      if (tomergefiles.length === 1) {
        var readStream = fs.createReadStream(tomergefiles[0]);

        var writeStream = fs.createWriteStream(outputfilepath);
        readStream.pipe(writeStream);
        var fileName = currentjobid + '.pdf'; //req.params.fileName;
        var filePath = outputfilepath;
        var stats = fs.statSync(filePath);
        if (stats.isFile()) {
          var downloadlink = `http://${ip_addr}:${port}/download/${fileName}`;
          res.send(200, downloadlink);
        } else {
          res.end(404);
        }
      }
    } else {
      merge(tomergefiles, outputfilepath, function (err) {
        if (err) return console.log(err);
        console.log('Successfully merged!');

        var fileName = currentjobid + '.pdf'; //req.params.fileName;
        var filePath = outputfilepath;
        var stats = fs.statSync(filePath);
        if (stats.isFile()) {
          var downloadlink = `http://${ip_addr}:${port}/download/${fileName}`;
          res.send(200, downloadlink);
        } else {
          res.end(404);
        }
      });
    }
  });
}
