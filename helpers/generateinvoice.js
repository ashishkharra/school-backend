// const puppeteer = require('puppeteer');
// const fs = require('fs-extra');
// const path = require('path');

// const generateInvoice = async (data, invoiceFileName) => {
//   try {
//     // 1. Launch browser
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     // 2. HTML template
//     const htmlContent = `
//       <html>
//         <body>
//           <h1>Salary Invoice</h1>
//           <p>Teacher: ${data.TEACHER_NAME}</p>
//           <p>Month: ${data.MONTH}</p>
//           <p>Base Salary: ${data.BASE_SALARY}</p>
//           <p>Working Days: ${data.WORKING_DAYS}</p>
//           <p>Leaves: ${data.LEAVES}</p>
//           <p>Per Day Salary: ${data.PER_DAY_SALARY}</p>
//           <p>Deductions: ${data.DEDUCTIONS}</p>
//           <p>Final Salary: ${data.FINAL_SALARY}</p>
//           <p>Status: ${data.STATUS}</p>
//         </body>
//       </html>
//     `;

//     await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

//     // 3. Ensure invoices folder exists
//       const invoicesFolder = path.join(__dirname, '../invoices');
//     await fs.ensureDir(invoicesFolder);

//     const fileName = `salary-${data.TEACHER_ID}-${data.MONTH}.pdf`;
//     const filePath = path.join(invoicesFolder, fileName);

//     // 4. Generate PDF
//     await page.pdf({ path: filePath, format: 'A4' });
//     await browser.close();

//     // Return relative path
//     return `/invoices/${fileName}`;

// // Return file path
//   } catch (err) {
//     console.error('Invoice generation error:', err);
//     return null;
//   }
// };

// module.exports = generateInvoice;



const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const generateInvoice = async (data) => {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const htmlContent = `
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              background: #f8f9fa;
              margin: 0;
              padding: 20px;
              color: #333;
            }

            .invoice-container {
              background: #fff;
              padding: 25px 35px;
              border-radius: 12px;
              max-width: 750px;
              margin: auto;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .school-header {
              text-align: center;
              border-bottom: 2px solid #0d6efd;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }

            .school-header h1 {
              margin: 0;
              color: #0d6efd;
            }

            .school-header p {
              font-size: 14px;
              margin: 4px 0;
              color: #555;
            }

            .invoice-title {
              text-align: center;
              margin-bottom: 25px;
              font-size: 20px;
              font-weight: bold;
              text-transform: uppercase;
              color: #333;
            }

            .details-table, .salary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }

            .details-table td {
              padding: 8px;
              font-size: 14px;
            }

            .salary-table th, .salary-table td {
              border: 1px solid #ccc;
              padding: 10px;
              font-size: 14px;
              text-align: left;
            }

            .salary-table th {
              background: #e9ecef;
            }

            .footer {
              text-align: center;
              font-size: 12px;
              color: #777;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }

            .highlight {
              font-weight: bold;
              color: #0d6efd;
            }
          </style>
        </head>

        <body>
          <div class="invoice-container">
            <div class="school-header">
              <h1>Springfield International School</h1>
              <p>123, Green Valley Road, Bengaluru, Karnataka</p>
              <p>Email: info@springfieldschool.com | Phone: +91 9876543210</p>
            </div>

            <div class="invoice-title">Teacher Salary Invoice</div>

            <table class="details-table">
              <tr>
                <td><strong>Teacher Name:</strong> ${data.TEACHER_NAME}</td>
             
              </tr>
              <tr>
                <td><strong>Month:</strong> ${data.MONTH}</td>
                <td><strong>Status:</strong> ${data.STATUS}</td>
              </tr>
            </table>

            <table class="salary-table">
              <tr>
                <th>Earnings / Deductions</th>
                <th>Amount (₹)</th>
              </tr>
              <tr>
                <td>Basic Salary</td>
                <td>${data.BASE_SALARY}</td>
              </tr>
              <tr>
                <td>Working Days</td>
                <td>${data.WORKING_DAYS}</td>
              </tr>
              <tr>
                <td>Leaves Taken</td>
                <td>${data.LEAVES}</td>
              </tr>
              <tr>
                <td>Per Day Salary</td>
                <td>${data.PER_DAY_SALARY}</td>
              </tr>
              <tr>
                <td>Leave Deductions</td>
                <td>${data.DEDUCTIONS}</td>
              </tr>
              <tr>
                <th>Final Payable Salary</th>
                <th class="highlight">${data.FINAL_SALARY}</th>
              </tr>
            </table>

            <p style="font-size: 14px;">
              <strong>Remarks:</strong> Salary for the month of ${data.MONTH} has been processed successfully.
            </p>

            <div class="footer">
              This is a system-generated payslip. No signature is required.<br>
              For any queries, please login to your teacher portal: <a href="${data.LOGIN_URL}">${data.LOGIN_URL}</a>
            </div>
          </div>
        </body>
      </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const invoicesFolder = path.join(__dirname, '../invoices');
    await fs.ensureDir(invoicesFolder);

    const fileName = `salary-${data.TEACHER_ID}-${data.MONTH}.pdf`;
    const filePath = path.join(invoicesFolder, fileName);

    await page.pdf({ path: filePath, format: 'A4' });
    await browser.close();

    return `/invoices/${fileName}`;
  } catch (err) {
    console.error('Invoice generation error:', err);
    return null;
  }
};

module.exports = generateInvoice;
