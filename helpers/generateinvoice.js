const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const generateInvoice = async (data, invoiceFileName) => {
  try {
    // 1. Launch browser
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // 2. HTML template
    const htmlContent = `
      <html>
        <body>
          <h1>Salary Invoice</h1>
          <p>Teacher: ${data.TEACHER_NAME}</p>
          <p>Month: ${data.MONTH}</p>
          <p>Base Salary: ${data.BASE_SALARY}</p>
          <p>Working Days: ${data.WORKING_DAYS}</p>
          <p>Leaves: ${data.LEAVES}</p>
          <p>Per Day Salary: ${data.PER_DAY_SALARY}</p>
          <p>Deductions: ${data.DEDUCTIONS}</p>
          <p>Final Salary: ${data.FINAL_SALARY}</p>
          <p>Status: ${data.STATUS}</p>
        </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 3. Ensure invoices folder exists
      const invoicesFolder = path.join(__dirname, '../invoices');
    await fs.ensureDir(invoicesFolder);

    const fileName = `salary-${data.TEACHER_ID}-${data.MONTH}.pdf`;
    const filePath = path.join(invoicesFolder, fileName);

    // 4. Generate PDF
    await page.pdf({ path: filePath, format: 'A4' });
    await browser.close();

    // Return relative path
    return `/invoices/${fileName}`;

// Return file path
  } catch (err) {
    console.error('Invoice generation error:', err);
    return null;
  }
};

module.exports = generateInvoice;
