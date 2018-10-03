'use strict'

class JournalController {
    async index ({ view, response, session }) {
        let isLogged = false
        if(session.get('user')) {
            isLogged = true
        }
        return view.render('pages.journals', { isLogged: isLogged })
    }
}

module.exports = JournalController