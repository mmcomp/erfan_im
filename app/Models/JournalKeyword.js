'use strict'

const Model = use('Model')

class JournalKeyword extends Model {
    static get table () {
        return 'journal_keywords'
    }

    static async keywordCheck (journal_id, data) {
        let journalKeywords = await JournalKeyword.query().where('journal_id', journal_id).fetch()
        journalKeywords = journalKeywords.toJSON()

        let inp = String(data).toLowerCase()
        let result = {
            c1: 0,
            c2: 0,
            c3: 0,
        }
        for(let jK of journalKeywords) {
            if(inp.indexOf(jK.theword.toLowerCase())>=0) {
                result[jK.category]++
            }
        }
        return result
    }
}

module.exports = JournalKeyword
