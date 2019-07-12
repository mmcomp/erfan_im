'use strict'

const Model = use('Model')

class JournalUserGroup extends Model {
  group () {
    return this.hasOne('App/Models/Group', 'groups_id', 'id')
  }

  journal () {
    return this.hasOne('App/Models/Journal', 'journal_id', 'id')
  }

  user () {
    return this.hasOne('App/Models/User', 'users_id', 'id')
  }

  static async grantAccess(users_id, groups_id, journal_id) {
    console.log('Grant Access', users_id, groups_id, journal_id)
    let acc = await JournalUserGroup.query().where({
      users_id, 
      groups_id, 
      journal_id,
    }).first()
    if(!acc) {
      const res = await JournalUserGroup.create({
        users_id, 
        groups_id, 
        journal_id,
      })
    }
  }
}

module.exports = JournalUserGroup
