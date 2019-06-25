'use strict'

const Model = use('Model')

class ArticleDefinedKeyword extends Model {
  article () {
    return this.hasOne('App/Models/Artical', 'article_id', 'id')
  }
}

module.exports = ArticleDefinedKeyword
