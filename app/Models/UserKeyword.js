'use strict'

const Model = use('Model')

class UserKeyword extends Model {
  static get table () {
    return 'user_keywords'
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

module.exports = UserKeyword