'use strict'

/** @type {import('@adonisjs/framework/src/Hash')} */
const Hash = use('Hash')

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class User extends Model {
  static boot () {
    super.boot()

    this.addHook('beforeSave', async (userInstance) => {
      if (userInstance.dirty.password) {
        userInstance.password = await Hash.make(userInstance.password)
      }
    })
  }

  static get table () {
    return 'users'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
  }

  tokens () {
    return this.hasMany('App/Models/Token')
  }

  permissions () {
    return this.hasMany('App/Models/GroupPermission', 'group_id', 'users_group_id')
  }

  country () {
    return this.hasOne('App/Models/Country', 'country_id', 'id')
  }
}

module.exports = User
