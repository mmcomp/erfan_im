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
}

module.exports = Artical