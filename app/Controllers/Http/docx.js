const StreamZip = require('node-stream-zip');
const fs = require('fs')
const dxe = require('docx-extractor')

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
                        for(let i = 0;i < refs.length;i++) {
                          theRef = refs[i]
                          if(i>0) {
                            theRef = theRef.substring(theRef.indexOf('.') + 2)
                          }
                          if(refs[i+1]) {
                            theRef += ':' + refs[i+1].split('.')[0]
                          }
                          ok = false
                          for(let j = 0;j < usedRefs.length;j++) {
                            if(theRef.indexOf(usedRefs[j])>=0) {
                              ok = true
                            }
                          }
                          if(ok) {
                            references.push(theRef)
                          }
                        }
                      }
                      console.log(references)
                      resolve(references)
                    })
                })
            }
        )
    }
}

return module.exports


