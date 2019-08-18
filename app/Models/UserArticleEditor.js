'use strict'

const Model = use('Model')

class UserArticleEditor extends Model {
  static get table () {
    return 'users_edits'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
  
  user () {
    return this.hasOne('App/Models/User', 'users_id', 'id')
  }
  
  sender () {
    return this.hasOne('App/Models/User', 'sender_id', 'id')
  }  
  
  article () {
    return this.hasOne('App/Models/Artical', 'article_id', 'id')
  }

  comments () {
    return this.hasMany('App/Models/ArticleComment', 'id', 'users_edits_id')
  }
}

module.exports = UserArticleEditor