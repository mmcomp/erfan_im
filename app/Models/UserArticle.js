'use strict'

const Model = use('Model')

class UserArticle extends Model {
  static get table () {
    return 'users_article'
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
}

module.exports = UserArticle