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
}

module.exports = Artical