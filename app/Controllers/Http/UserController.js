'use strict'

const Country = use('App/Models/Country')
const User = use('App/Models/User')

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

    async home ({ view, auth, session }) {
        let loggedIn = true
        let country = []
        try{
            await auth.check()
        }catch(e) {
            loggedIn = false
            country = await Country.all()
            country = country.toJSON()
        }
    
        console.log('session', session.all())
        // console.log('country', country)
        let msg = session.get('msg')
        session.forget('msg')
    
        return view.render('main.index', { isLogged: loggedIn, msg: msg, country: country})
    }

    async signup ({ request, auth, view, response, session }) {
        console.log('Request')
        console.log(request.all())
        let email = request.all()['email']
        let password = request.all()['password']
        let fname = request.all()['fname']
        let lname = request.all()['lname']
        let country_id = request.all()['country_id']
        let university_institute = request.all()['university_institute']
        let user = await User.query().where('email', email).first()
        if(user) {
            session.put('msg', 'Email exists in our Directory, please select another email!')
            return response.redirect('/')
        }

        user = new User
        user.email = email
        user.password = password
        user.fname = fname
        user.lname = lname
        user.country_id = country_id
        user.university_institute = university_institute
        await user.save()

        session.put('msg', 'You are Signed Up. Now you can Login with you email and password')

        return response.redirect('/')
    }
}

module.exports = UserController
