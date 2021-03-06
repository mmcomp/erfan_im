'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Journal extends Model {
  static get table () {
    return 'journal'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }
  
  extra() {
    return this.hasMany('App/Models/JournalExtra')
  }
  
  keyword() {
    return this.hasMany('App/Models/JournalKeyword')
  }
}

module.exports = Journal
