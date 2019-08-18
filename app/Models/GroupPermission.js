'use strict'

const Model = use('Model')

class GroupPermission extends Model {
  static get table () {
    return 'group_premissions'
  }

  static get createdAtColumn () {
    return 'created_at'
  }

  static get updatedAtColumn () {
    return 'updated_at'
	}
}

module.exports = GroupPermission
