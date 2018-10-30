'use strict'

const Model = use('Model')

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
  
  author () {
    return this.hasOne('App/Models/User', 'author_id', 'id')
  }

  editors () {
    return this.belongsToMany('App/Models/User', 'article_id', 'users_id').pivotTable('users_edits')
  }
}

module.exports = Artical