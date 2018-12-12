'use strict'

const Model = use('Model')
const axios = require('axios')
// let scholar = require('google-scholar')

class Artical extends Model {
  static get table () {
    return 'article'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  async getScholar () {
    try{
      const response = await axios.get('https://scholar.google.com/scholar?q="' + this.full_title + '"')
      let citIndex = response.data.indexOf('Cited by ')
      // console.log(citIndex)
      let tmp = 0
      if(citIndex>=0) {
        tmp = parseInt(response.data.split('Cited by ')[1], 10)
        if(isNaN(tmp)) {
          tmp = 0
        }
      }
      this.citiations = tmp
      await this.save()
      // let resultObj = await scholar.search(this.full_title)
      // console.log('Scholar', resultObj)
    }catch(e) {
      console.log('Scholar Error', e)
    }
  }
  
  author () {
    return this.hasOne('App/Models/User', 'author_id', 'id')
  }

  authors () {
    return this.belongsToMany('App/Models/User', 'article_id', 'users_id').pivotTable('users_article')
  }
  
  editors () {
    return this.belongsToMany('App/Models/User', 'article_id', 'users_id').pivotTable('users_edits')
  }

  journal () {
    return this.hasOne('App/Models/Journal', 'journal_id', 'id')
  }

  useredits () {
    return this.hasMany('App/Models/UserArticleEditor', 'id', 'article_id')
  }

  comments () {
    return this.manyThrough('App/Models/UserArticleEditor', 'comments', 'id', 'article_id')
  }

  keyword () {
    return this.hasMany('App/Models/ArticleKeyword', 'id', 'article_id')
  }
}

module.exports = Artical