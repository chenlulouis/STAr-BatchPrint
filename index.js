// 引入puppeteer和restify
const puppeteer = require('puppeteer');
const restify = require('restify');

//指定Server的IP地址和端口
const ip_addr = '127.0.0.1'; 
const port = '8080';

//启动Server
var server = restify.createServer({
  name: 'Batch-Print-Server'
});

server.listen(port, ip_addr, function() {
  console.log('%s listening at %s ', server.name, server.url);
});

//启用restify的插件
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({ requestBodyOnGet: true }));

//指定Route
PATH = '/print';
//指定相应Route的方法
server.post({ path: PATH, version: '0.0.1' }, postNewPrintJob);

function postNewPrintJob(req, res, next) {
  var job = {};
  //    job.title = req.params.title;
  //    job.description = req.params.description;
  job.location = req.params.location;
  job.filename = req.params.filename;
  job.postedOn = new Date().toLocaleString();

  console.log(job);

  //设置跨域响应
  res.setHeader('Access-Control-Allow-Origin', '*');

  (async () => {
    //启动Chrome
    const browser = await puppeteer.launch();
    //新建Page
    const page = await browser.newPage();
    //打开页面 load方式指页面所有事务执行完毕
    await page.goto(job.location, { waitUntil: 'load' });
    //指定响应Media为Print
    await page.emulateMedia('print');
    //生成PDF文件，format设为A4,margin为默认页边距。
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
    //关闭浏览器。
    browser.close();

    if (pdffile) {
    //返回结果。
      res.send(200, pdffile);
      return next();
    }
    return next(err);
  })();
}
