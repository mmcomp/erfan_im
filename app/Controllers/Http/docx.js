const StreamZip = require('node-stream-zip')
const fs = require('fs')
const dxe = require('docx-extractor')
const dns = require('dns')
const nodemailer = require("nodemailer")
const JSZip = require('jszip')
const Docxtemplater = require('docxtemplater')
const ImageModule = require('open-docxtemplater-image-module')
const path = require('path')
const word2pdf = require('word2pdf')
const pandoc = require('node-pandoc')
let addressIndex = 0

module.exports = {
    // Reference
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
                        // let searchRes = refs[refs.length-1].search(/([0-9])([:])([0-9])+/g)
                        // console.log('Search Result', searchRes)
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
                            references.push(/*refIndex + ' : ' + */theRef)
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
    // EMAIL
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
    },
    // PDF
    fillTemplateWord: function(data, outputname, images) {
      let baseDirAr = __dirname.split('/'), baseDir = ''
      let theImages = images
      for(var i = baseDirAr.length - 4;i>=0;i--) {
        baseDir = '/' + baseDirAr[i] + baseDir
      }
      baseDir = baseDir.substring(1)
      if(fs.existsSync(baseDir + '/public/pdf/' + outputname + '.docx')) {
        fs.unlinkSync(baseDir + '/public/pdf/' + outputname + '.docx')
      }
      return new Promise(function (resolve, reject) {
        try {
          var content = fs.readFileSync(path.resolve(baseDir, 'template.docx'), 'binary')
          var zip = new JSZip(content)
          // zip.folder('word').folder('media').file('j_0.png', fs.readFileSync(path.resolve(baseDir, 'public/static/img/journal/j_0.png')))

          if(theImages.length>0) {
            // console.log('zip rels')
            let theRels = zip.folder('word').folder('_rels').file('document.xml.rels')
            let fileBuffer = new Buffer(theRels._data.getContent())
            fileBuffer = fileBuffer.toString('utf8')
            let tmpRef = `<Relationship Id="#id#" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/#name#">`
            let newRefs = '', imageName = ''
            for(let refI = 0;refI < theImages.length;refI++) {
              imageName = theImages[refI].split('/')[theImages[refI].split('/').length-1]
              newRefs += tmpRef.replace('#id#', `rId${ refI }`).replace('#name#', imageName)
              // console.log('Add Image to Media')
              // console.log('Image Name', imageName)
              // console.log('Image Path', path.resolve(baseDir, 'public/' + theImages[refI]))
              zip.folder('word').folder('media').file(imageName, fs.readFileSync(path.resolve(baseDir, 'public/' + theImages[refI])))
            }
            newRefs += '</Relationships>'
            fileBuffer =  fileBuffer.replace('</Relationships>', newRefs)
            zip.folder('word').folder('_rels').file('document.xml.rels', fileBuffer)
            fs.writeFileSync(path.resolve(baseDir, 'document.xml.rels'), fileBuffer.toString('utf8'))
          }
          var opts = {}
          opts.centered = false
          opts.fileType = "docx"
          
          opts.getImage = function(tagValue, tagName) {
              return fs.readFileSync(tagValue)
          }
          
          opts.getSize = function(img, tagValue, tagName) {
              return [70, 70]
          }
          
          var imageModule = new ImageModule(opts)

          var doc = new Docxtemplater()

          doc.attachModule(imageModule)

          doc.setOptions({linebreaks:true})

          doc.loadZip(zip)
    
          doc.setData(data)
  
          doc.render()
          
          var buf = doc.getZip().generate({type: 'nodebuffer'})

          fs.writeFileSync(path.resolve(baseDir + '/public/pdf', outputname + '.docx'), buf)

          resolve(baseDir + '/public/pdf/' + outputname + '.docx')
        }catch (error) {
          var e = {
              message: error.message,
              name: error.name,
              stack: error.stack,
              properties: error.properties,
          }
          console.log(JSON.stringify({error: e}))
          reject({error: e})
        }
      });
      
    },

    docxToPdf:async function(docxfile, outputname) {
      let baseDirAr = __dirname.split('/'), baseDir = ''
      for(var i = baseDirAr.length - 4;i>=0;i--) {
        baseDir = '/' + baseDirAr[i] + baseDir
      }
      baseDir = baseDir.substring(1)
      if(fs.existsSync(baseDir + '/public/pdf/' + outputname + '.pdf')) {
        fs.unlinkSync(baseDir + '/public/pdf/' + outputname + '.pdf')
      }
      
      const data = await word2pdf(docxfile)
      // console.log('PDF Data', data)
      fs.writeFileSync(baseDir + '/public/pdf/' + outputname + '.pdf', data);
      
      return true
      /*
      return new Promise(function( resolve, reject) {
        console.log('pandoc ' + docxfile + ' -f docx -t pdf -o ' + baseDir + '/public/pdf/' + outputname + '.pdf')
        try{
          pandoc(docxfile, '-f docx -t pdf -o ' + baseDir + '/public/pdf/' + outputname + '.pdf', function(err, result) {
            if(err) {
              reject(err)
            }

            console.log('Pdf Convertion Result', result)
            resolve(result)
          })
        }catch(e){
          reject(e)
        }
      })
      */
    },

    docxToEpub: function(docxfile, outputname) {
      let baseDirAr = __dirname.split('/'), baseDir = ''
      for(var i = baseDirAr.length - 4;i>=0;i--) {
        baseDir = '/' + baseDirAr[i] + baseDir
      }
      baseDir = baseDir.substring(1)
      if(fs.existsSync(baseDir + '/public/pdf/' + outputname + '.epub')) {
        fs.unlinkSync(baseDir + '/public/pdf/' + outputname + '.epub')
      }
      return new Promise(function( resolve, reject) {
        try{
          pandoc(docxfile, '-f docx -t epub -o ' + baseDir + '/public/pdf/' + outputname + '.epub', function(err, result) {
            if(err) {
              reject(err)
            }

            // console.log('Epub Convertion Result', result)
            resolve(result)
          })
        }catch(e){
          reject(e)
        }
      })
    }
}

return module.exports


