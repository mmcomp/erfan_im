'use strict'

const Model = use('Model')

class JournalExtra extends Model {
    static get table () {
        return 'journal_extra'
    }
}

module.exports = JournalExtra
