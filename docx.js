const StreamZip = require('node-stream-zip');
const dns = require('dns');
const nodemailer = require("nodemailer");

module.exports = {

    open: function(filePath) {
        return new Promise(
            function(resolve, reject) {
                const zip = new StreamZip({
                    file: filePath,
                    storeEntries: true
                })

                zip.on('ready', () => {
                    var chunks = []
                    var content = ''
                    zip.stream('word/document.xml', (err, stream) => {
                        if (err) {
                            reject(err)
                        }
                        stream.on('data', function(chunk) {
                            chunks.push(chunk)
                        })
                        stream.on('end', function() {
                            content = Buffer.concat(chunks)
                            zip.close()
                            resolve(content.toString())
                        })
                    })
                })
            }
        )
    },

    extract: function(filePath) {
        return new Promise(
            function(resolve, reject) {
                module.exports.open(filePath).then(function (res, err) {
                    if (err) { 
                        reject(err) 
                    }

                    var body = ''
                    var components = res.toString().split('<w:t')

                    for(var i=0;i<components.length;i++) {
                        var tags = components[i].split('>')
                        var content = tags[1].replace(/<.*$/,"")
                        body += content+' '
                    }

                    resolve(body)
                })
            }
        )
    },

    sendMail: function(email, subject, text, html) {
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


