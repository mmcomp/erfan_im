'use strict'

const Hash = use('Hash')

class UserController {
    async login ({ request, auth }) {
        const { email, password } = request.all()
        try{
            await auth.attempt(email, password)
            return 'Logged in successfully'
        }catch(e) {
            console.log(e)
            return 'not login<br/>' + thePassword
    
        }
    }

    show ({ auth, params }) {
        if (auth.user.id !== Number(params.id)) {
            return 'You cannot see someone else\'s profile'
        }
        return auth.user
    }
}

module.exports = UserController
