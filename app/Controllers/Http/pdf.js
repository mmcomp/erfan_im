'use strict'

const request = require('request')
const fs = require('fs')
const apiKey = 'eb80cccb489d1494f0fc2b753041af687e53353a'
module.exports =class  {
  constructor() {

  }
  async loadFile(inputFile) {
    const formData = {
      target_format: 'pdf',
      source_file: fs.createReadStream(inputFile)
    }

    return new Promise(function(resolve, reject) {
      request.post({url:'https://sandbox.zamzar.com/v1/jobs/', formData: formData}, function (err, response, body) {
          if (err) {
              console.error('Unable to start conversion job', err)
              reject(err)
          } else {
              console.log('SUCCESS! Conversion job started:', JSON.parse(body))
              resolve(JSON.parse(body))
          }
      }).auth(apiKey, '', true)
    })
  }
  async checkStatus(jobID) {
    return new Promise(function(resolve, reject) {
      request.get ('https://sandbox.zamzar.com/v1/jobs/' + jobID, function (err, response, body) {
          if (err) {
              console.error('Unable to get job', err)
              reject(err)
          } else {
              console.log('SUCCESS! Got job:', JSON.parse(body))
              resolve(JSON.parse(body))
          }
      }).auth(apiKey, '', true)
    })
  }
  async waitStatus(jobID) {
    const thisFn = this.waitStatus
    console.log('Checking status for', jobID)
    let tmp = await this.checkStatus(jobID)
    let count = 0
    while(tmp.status!='successful' && count<10) {
      tmp = await this.checkStatus(jobID)
      count++
    }
    return tmp
  }
  async getPdf(fileID, localFilename) {
    return new Promise(function(resolve, reject) {
      request.get({url: 'https://sandbox.zamzar.com/v1/files/' + fileID + '/content', followRedirect: false}, function (err, response, body) {
        if (err) {
          console.error('Unable to download file:', err)
          reject(err)
        } else {
          if (response.headers.location) {
            var fileRequest = request(response.headers.location)
            fileRequest.on('response', function (res) {
                res.pipe(fs.createWriteStream(localFilename))
            });
            fileRequest.on('end', function () {
                console.log('File download complete')
                resolve()
            });
          }
        }
      }).auth(apiKey,'',true).pipe(fs.createWriteStream(localFilename))
    })
  }
  async convertDocxToPdf(inputFile, localFilename) {
    let jobID = await this.loadFile(inputFile)
    jobID = jobID.id
    let fileId = await this.waitStatus(jobID)
    if(fileId.errors) {
      return false
    }
    fileId = fileId.target_files[0].id
    await this.getPdf(fileId, localFilename)
    return true
  }
}

return module.exports