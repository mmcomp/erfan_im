'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Partner extends Model {
  static get table () {
    return 'partners'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
  
  user () {
    return this.hasOne('App/Models/User', 'officer_id', 'id')
  }
}

module.exports = Partner
