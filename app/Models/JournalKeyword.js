'use strict'

const Model = use('Model')

class JournalKeyword extends Model {
    static get table () {
        return 'journal_keywords'
    }
}

module.exports = JournalKeyword
