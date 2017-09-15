// 引入puppeteer和restify
const puppeteer = require('puppeteer');
const restify = require('restify');

//指定Server的IP地址和端口
const ip_addr = '192.168.3.2';
const port = '8080';
const pdffiledirectory = 'pdffiles';

//启动Server
var server = restify.createServer({
  name: 'Batch-Print-Server'
});

//启动服务端监听
server.listen(port, ip_addr, function() {
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
server.on('MethodNotAllowed', function(request, response) {
  if (request.method.toUpperCase() === 'OPTIONS') {
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
server.get('/', function(req, res, next) {
  res.send('Hello BatchPrint!');
  return next();
});
// testing the service
server.get('/test', function(req, res, next) {
  res.send('testing...');
  next();
});
server.get(
  '/pdffiles/:filename',
  function(req,res,next){
    res.header('Content-Disposition','attachment; filename='+req.params)
    return next(next=>
     restify.plugins.serveStatic({
       directory: __dirname,
       default: 'index.html',
       file: '123'
     }))
  }
 
);
//指定Route
PATH = '/print';
//指定相应Route的方法
server.post(
  {
    path: PATH,
    version: '0.0.1'
  },
  postNewPrintJob
);

let Duplex = require('stream').Duplex;
function bufferToStream(buffer) {
  let stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

function postNewPrintJob(req, res, next) {
  console.log(req.body);

  var joblist = req.body;

  if (!joblist) return;
  console.log(joblist.length);
  if (joblist.length == 1) {
    const job = joblist[0];

    (async () => {
      //启动Chrome
      const browser = await puppeteer.launch();
      //新建Page
      const page = await browser.newPage();

      //打开页面 load方式指页面所有事务执行完毕
      await page.goto(job.printpage, {
        waitUntil: 'load'
      });
      //指定响应Media为Print
      await page.emulateMedia('print');
      //生成PDF文件，format设为A4,margin为默认页边距。
      const pdffile = await page.pdf({
        path: pdffiledirectory + '/' + job.docname + '.pdf',
        format: 'A4',
        margin: {
          top: '10mm',
          bottom: '10mm',
          left: '10mm',
          right: '10mm'
        }
      });
      //关闭浏览器。
      browser.close();
      //设置跨域响应
      res.setHeader('Access-Control-Allow-Origin', '*');
      // if (pdffile) {
      //   //返回结果。
      //   res.send(200, pdffile);
      //   return next();
      // }
      const stream = bufferToStream(pdffile);
      res.header('Content-Type','application/octet-stream')
      res.send(200, stream);
    })();
  }
  else
  {
    joblist.forEach(job => {
      (async () => {
        //启动Chrome
        const browser = await puppeteer.launch();
        //新建Page
        const page = await browser.newPage();

        //打开页面 load方式指页面所有事务执行完毕
        await page.goto(job.printpage, { waitUntil: 'load' });
        //指定响应Media为Print
        await page.emulateMedia('print');
        //生成PDF文件，format设为A4,margin为默认页边距。
        const pdffile = await page.pdf({
          path: pdffiledirectory + '/' + job.docname + '.pdf',
          format: 'A4',
          margin: {
            top: '10mm',
            bottom: '10mm',
            left: '10mm',
            right: '10mm'
          }
        });
        //关闭浏览器。
        browser.close();
      })();
    });
  }
  return next();
}
