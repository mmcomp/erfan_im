function ref2xml(inp) {
  inp = String(inp)

  // Authors
  let tmp = inp.split('(')[0]
  let firstNames = tmp.split('&')[0].split('.,')
  let i = 0
  for(i = 0;i < firstNames.length-1;i++) {
    firstNames[i] = {
      fname : firstNames[i].split(',')[0].trim(),
      lname : firstNames[i].split(',')[1].trim() + '.'
    }
  }
  firstNames[i] = {
    fname : firstNames[i].split(',')[0].trim(),
    lname : firstNames[i].split(',')[1].trim()
  }
  if(tmp.split('&')[1]) {
    firstNames.push({
      fname : tmp.split('&')[1].split(',')[0].trim(),
      lname : tmp.split('&')[1].split(',')[1].trim()
    })
  }

  // article
  let publish_year = inp.split('(')[1].split(')')[0]
  let article_title = inp.split(').')[1].split('.')[0]
  let journal_name_tmp = inp.split(').')[1].split('.')[1].split(':')[0].split(' ')
  let publish_vol = journal_name_tmp[journal_name_tmp.length-1].split('(')[0]
  let publish_issue = (journal_name_tmp[journal_name_tmp.length-1].split('(')[1])?journal_name_tmp[journal_name_tmp.length-1].split('(')[1].split(')')[0]:''
  let journal_name = journal_name_tmp.slice(0, journal_name_tmp.length-1).join(' ')
  let pages = inp.split(':')[1].trim()

  return {
    authors: firstNames,
    publish_year: publish_year,
    article_title: article_title,
    journal_name: journal_name,
    publish_vol: publish_vol,
    publish_issue: publish_issue,
    pages: pages,
  }
}

console.log(ref2xml("Babai, F., Musevi ‐ Aghdam, J., Schurch, W., Royal, A. &amp; Gabbiani, G. (1990). Coexpression of α ‐ sarcomeric actin, α ‐ smooth muscle actin and desmin during myogenesis in rat and mouse embryos I. Skeletal muscle.  Differentiation  44(2): 132-142"))