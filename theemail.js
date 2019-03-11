const dns = require('dns');
const nodemailer = require("nodemailer");

module.exports = {
  send: function(email, subject, text, html) {
    return new Promise(
      function(resolve, reject) {
        // const email = 'arjunphp@gmail.com';
        const domain = email.split('@')[1];  
        dns.resolve(domain, 'MX', function(err, addresses) {    
          if (err) {
            console.log('No MX record exists, so email is invalid.');  
            reject('No MX record exists, so email is invalid.');  
          } else if (addresses && addresses.length > 0) {      
            console.log('This MX records exists So I will accept this email as valid.', addresses);
            for(var i = 0;i < addresses.length;i++) {
              try{
                let transporter = nodemailer.createTransport({
                  host: addresses[i].exchange,
                  port: 25,
                  secure: false,
                });

                let mailOptions = {
                  from: '"iMaqPress" <info@imaqpress.com>',
                  to: email,
                  subject: subject,
                  text: text,
                  html: html,
                };
              

                let info = await transporter.sendMail(mailOptions)

                resolve(info);
              }catch(e) {

              }
            }
          }
        });
      }
    );
  }
}

return module.exports
