'use strict'

const Model = use('Model')

class ArticleKeyword extends Model {
  static get table () {
    return 'article_keywords'
  }

  keyword () {
    return this.belongsTo('App/Models/JournalKeyword', 'journal_keywords_id', 'id')
  }

  article () {
    return this.belongsTo('App/Models/Artical', 'article_id', 'id')
  }
}

module.exports = ArticleKeyword
