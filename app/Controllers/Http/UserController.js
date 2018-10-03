'use strict'

class UserController {
    async logout ({ auth, view, response, session }) {
        session.clear()
        try{
            await auth.logout()
        }catch(e) {

        }
        // return view.render('main.index')
        return response.redirect('/')
    }

    async login ({ request, auth, view, response, session }) {
        const { email, password } = request.all()
        let msg = 'Email or Password is not Correct',logedIn = true, rememberme = (request.all()['rememberme'])?true:false
        try{
            await auth.check()
        }catch(e) {
            // console.log('Check Error')
            // console.log(e)
            logedIn = false
        }
        if(!logedIn) {
            session.clear()

            try{
                await auth.remember(rememberme).attempt(email, password)
                msg = 'Logged in successfully'
                logedIn = true;
                let user = await auth.getUser()
                session.put('user', user.id)

            }catch(e) {
                // console.log('Login Error')
                // console.log(e)
            }
        }else {
            msg = 'Already Loged In'
        }
        session.put('msg', msg)
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
