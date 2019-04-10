const StreamZip = require('node-stream-zip');
const fs = require('fs')
const dxe = require('docx-extractor')
const dns = require('dns');
const nodemailer = require("nodemailer")
let addressIndex = 0

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

    reference: function(filePath) {
        return new Promise(
            function(resolve, reject) {
                dxe.getHyperlinks(filePath, function(data){
                    console.log(data)
                    let usedRefs = []
                    for(let i = 0;i < data.length;i++) {
                      usedRefs.push(data[i].split(' ')[0])
                    }
                    module.exports.extract(filePath).then(function(res, err) {
                      if (err) {
                          console.log(err)
                          reject(err)
                      }
                      // console.log(res)
                      fs.writeFileSync('test.txt', res)
                      let refs = res.split('References'), references = [], start = 0, theRef = '', ok = false
                  
                      if(refs.length<=1) {
                        refs = null
                      }else {
                        refs = refs[refs.length-1].split(':')
                        // console.log('Refs when split by ";" :')
                        // console.log(refs)
                        var refIndex = 1
                        for(let i = 0;i < refs.length;i++) {
                          theRef = refs[i]
                          if(i>0) {
                            theRef = theRef.substring(theRef.indexOf('.') + 2)
                          }
                          if(refs[i+1]) {
                            theRef += ':' + refs[i+1].split('.')[0]
                          }
                          // ok = false
                          // for(let j = 0;j < usedRefs.length;j++) {
                          //   if(theRef.indexOf(usedRefs[j])>=0) {
                          //     ok = true
                          //   }
                          // }
                          // if(ok) {
                          if(theRef!='') {
                            references.push(refIndex + ' : ' + theRef)
                            refIndex++
                          }
                          // }
                        }
                      }
                      console.log(references)
                      resolve(references)
                    })
                })
            }
        )
    },

    _sendMail: function (addresses, email, subject, text, html, _sendMail, fn) {
      let i = addressIndex
      // console.log('Send mail function', _sendMail)
      // console.log('Sending email mx ', addresses[i].exchange)
      try{
        if(!addresses[i]) {
          // console.log('finish trying')
          fn(false)
          return false
        }
        // console.log('Sending email mx ', addresses[i].exchange)
        let transporter = nodemailer.createTransport({
          host: addresses[i].exchange,
          port: 25,
          secure: false,
        })

        let mailOptions = {
          from: '"iMaqPress" <info@imaqpress.com>',
          to: email,
          subject: subject,
          text: text,
          html: html,
        }
      
        transporter.sendMail(mailOptions).then(info => {
          addressIndex = 0
          fn(info)
        }).catch(error => {
          // console.log('Error happend', error)
          // console.log('Error sending')
          addressIndex++
          _sendMail(addresses, email, subject, text, html, _sendMail, fn)
        })

      }catch(e) {
        // console.log('Error sending', e)
        // console.log("Error total")
        addressIndex++
        _sendMail(addresses, email, subject, text, html, _sendMail, fn)
      }
    },

    sendMail: function(email, subject, text, html) {
      var _sendMail = this._sendMail
      return new Promise(
        function(resolve, reject) {
          // const email = 'arjunphp@gmail.com';
          const domain = email.split('@')[1]
          dns.resolve(domain, 'MX', function(err, addresses) {    
            if (err) {
              console.log('No MX record exists, so email is invalid.')
              reject('No MX record exists, so email is invalid.'); 
            } else if (addresses && addresses.length > 0) {      
              // console.log('This MX records exists So I will accept this email as valid.', addresses)
              _sendMail(addresses, email, subject, text, html, _sendMail, function(info) {
                if(info===false) {
                  reject()
                }else {
                  resolve(info)
                }
              })
            }
          })
        }
      );
    }
}

return module.exports


