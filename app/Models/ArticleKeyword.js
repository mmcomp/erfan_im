'use strict'

const Model = use('Model')

class ArticleKeyword extends Model {
    static get table () {
        return 'article_keywords'
    }


  keyword () {
    return this.belongsTo('App/Models/JournalKeyword', 'journal_keywords_id', 'id')
  }
}

module.exports = ArticleKeyword
