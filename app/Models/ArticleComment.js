'use strict'

const Model = use('Model')

class ArticleComment extends Model {
  static get table () {
    return 'article_comments'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
  
  useredit () {
    return this.hasOne('App/Models/UserArtileEditor', 'users_edits_id', 'id')
  }
}

module.exports = ArticleComment