const fs = require('fs')
const striptags = require('striptags')
const Entities = require('html-entities').AllHtmlEntities

function html2realxml (inp, doi, baseDir) {
  if(inp==null || inp=='') {
      return '<p></p>'
  }
  const entities = new Entities()
  let out = striptags(inp, ['p', 'table', 'tr', 'td', 'a', 'img'], '')
  out = entities.decode(out)
  
  out = out.replace(/&nbsp;/g, ' ')

  let m, tmp, href, retmp, re, alt, extension
  // links
  re = /<\s*a[^>]*>/g

  do {
      m = re.exec(out)
      if (m) {
          tmp = out.substring(m.index+1).toLowerCase().split('href="')
          if(tmp.length>1) {
              tmp = tmp[1].split('"')[0]
              if(tmp.indexOf('#')==0) {
                  href= tmp.replace(/#_enref/g, 'ref-')
                  retmp = new RegExp(m[0], 'g')
                  out = out.replace(retmp, `<xref ref-type="bibr" rid="${ href }">`)
              }
          }
      }
  } while (m)
  out = out.replace(/<\/a>/g, `</xref>`)
  //\links
  // images
  re = /<\s*img[^>]*>/g
  let images = []


  let index = 1, imageTmp = '', imageTemp = `      
  <fig id="fig-#index#">
      <object-id pub-id-type="doi">${ doi }/fig-#index#</object-id>
      <label>Figure #index#</label>
      <caption>
      <title>#title#</title>
      </caption>
      <graphic mimetype="image" mime-subtype="#extension#" xlink:href="#src#" />
  </fig>`
  do {
      m = re.exec(out)
      if (m) {
          href = ''
          tmp = out.substring(m.index+1).toLowerCase().split('src="')
          if(tmp.length>1) {
              tmp = tmp[1].split('"')[0]
              href= tmp
          }
          extension = (href.split('.')[1])?href.split('.')[1]:'png'
          alt = ''
          tmp = out.substring(m.index+1).toLowerCase().split('alt="')
          if(tmp.length>1) {
              tmp = tmp[1].split('"')[0]
              alt= tmp
          }
          retmp = new RegExp(m[0], 'g')
          imageTmp = imageTemp.replace(/#index#/g, index).replace(/#src#/g, baseDir + href)
          .replace(/#title#/g, alt).replace(/#extension#/g, extension)
          out = out.replace(retmp, `${ imageTmp}`)
          index++
      }
  } while (m)
  //\images

  return out
}

let html = fs.readFileSync('test.html')
html = html.toString()
console.log(html)

let xml = html2realxml (html, '12324.344/ff.sfsd', 'http://imaqpress.com:3333')
console.log('XML')
console.log(xml)