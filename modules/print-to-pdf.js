function PrintToPDF() {
var job;
this.setjob=function(ojob){
    this.job=ojob;
}
 this.print = async function() {
    //启动Chrome
    const browser = await puppeteer.launch();
    //新建Page
    const page = await browser.newPage();

    //打开页面 load方式指页面所有事务执行完毕
    await page.goto(this.job.printpage, {
      waitUntil: 'load'
    });
    //指定响应Media为Print
    await page.emulateMedia('print');
    //生成PDF文件，format设为A4,margin为默认页边距。
    const pdffile = await page.pdf({
      path: pdffiledirectory + '/' + this.job.docname + '.pdf',
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
  }
}
// Export the Parser constructor from this module.
module.exports = PrintToPDF;
