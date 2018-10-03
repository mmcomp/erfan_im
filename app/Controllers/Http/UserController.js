'use strict'

const Hash = use('Hash')

class UserController {
    async logout ({ auth, view, response }) {
        try{
            await auth.logout()
        }catch(e) {

        }
        // return view.render('main.index')
        return response.redirect('/')
    }

    async login ({ request, auth, view, response }) {
        const { email, password } = request.all()
        let msg = 'Email or Password is not Correct',logedIn = true, rememberme = (request.all()['rememberme'])?true:false
        try{
            await auth.check()
        }catch(e) {
            logedIn = false
        }
        if(!logedIn) {
            try{
                await auth.remember(rememberme).attempt(email, password)
                msg = 'Logged in successfully'
                logedIn = true;
            }catch(e) {
            }
        }else {
            msg = 'Already Loged In'
        }
        // return view.render('main.index', {message: msg, isLogged: logedIn})
        return response.route('home', {message: msg, isLogged: logedIn})
    }

    show ({ auth, params }) {
        if (auth.user.id !== Number(params.id)) {
            return 'You cannot see someone else\'s profile'
        }
        return auth.user
    }
}

module.exports = UserController
