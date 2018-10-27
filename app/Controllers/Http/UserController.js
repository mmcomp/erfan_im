'use strict'

const Country = use('App/Models/Country')
const User = use('App/Models/User')
const Journal = use('App/Models/Journal')
const Artical = use('App/Models/Artical')

class UserController {
    async logout ({ auth, response, session }) {
        console.log('Log Out')
        session.clear()
        console.log('session', session.all())
        try{
            await auth.logout()
        }catch(e) {

        }
        // return view.render('main.index')
        return response.redirect('/')
    }

    async login ({ request, auth, response, session }) {
        const { email, password } = request.all()
        let msg_type ='', msg = 'Email or Password is not Correct',logedIn = true, rememberme = (request.all()['rememberme'])?true:false
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
                console.log('Remember Me : ', rememberme)
                await auth.remember(rememberme).attempt(email, password)
                msg = 'Logged in successfully'
                logedIn = true;

                let user = await User.query().where('id', auth.user.id).with('permissions').first()
                console.log('User', user.toJSON())
                user = user.toJSON()
                let permissions = {}
                for(let i = 0;i < user.permissions.length;i++) {
                    permissions[user.permissions[i].permission_key] = true
                }
                user.permissions = permissions
                console.log(user)
                session.put('user', user)
                
            }catch(e) {
                console.log('Login Error')
                console.log(e)
                msg = 'Login information is wrong'
                msg_type = 'danger'
            }
        }else {
            msg_type = 'primary'
            msg = 'Already Loged In'
        }

        session.put('msg', msg)
        session.put('msg_type', msg_type)

        return response.route('home', {message: msg, isLogged: logedIn})
    }

    async home ({ view, auth, session }) {
        let loggedIn = true
        let country = [], user = {}
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
        let msg_type = (session.get('msg_type')?session.get('msg_type'):'')
        session.forget('msg')
        session.forget('msg_type')
        if(loggedIn) {
            user = session.get('user')
        }
        return view.render('main.index', { isLogged: loggedIn, msg: msg, msg_type:msg_type, country: country, user: user})
    }

    async signup ({ request, response, session }) {
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

    async admin ({ request, auth, view, response, session }) {
        if(!session.get('user')) {
            var msg = 'You must Login first', msg_type = 'danger'

            session.put('msg', msg)
            session.put('msg_type', msg_type)
    
            return response.route('home', {message: msg, isLogged: false})
        }

        let user = session.get('user')

        if(user.group_id==1) {
            // Admin
            let journals = await Journal.all()
            journals = journals.toJSON()
            let requestCount = 0
            let cities = []
            for(let journal of journals) {
                if(journal.status == 'requested') {
                    requestCount++
                }
                if(journal.status == 'aproved' && journal.city_id && cities.indexOf(journal.city_id)<0) {
                    cities.push(journal.city_id)
                }
            }
            let users = await User.all()
            users = users.toJSON()
            let directors = []
            let chiefEditors = []
            // let associateEditors = []
            let managingEditors = []
            let editorials = []
            let institutesUniversities = []
            let authors = []
            let countries = []

            for(let theUser of users) {
                if(theUser.group_id == 1) {
                    directors.push(theUser)
                }else if(theUser.group_id == 2) {
                    chiefEditors.push(theUser)
                }else if(theUser.group_id == 3) {
                    managingEditors.push(theUser)
                }else if(theUser.group_id == 4) {
                    editorials.push(theUser)
                }else if(theUser.group_id == 5) {
                    authors.push(theUser)
                }
                if(theUser.university_institute && institutesUniversities.indexOf(theUser.university_institute)<0) {
                    institutesUniversities.push(theUser.university_institute)
                }
                if(theUser.country_id && countries.indexOf(theUser.country_id)<0) {
                    countries.push(theUser.country_id)
                }
            }
            let articles = await Artical.all()
            articles = articles.toJSON()
            let articleViews = 0
            let articleDownloads = 0
            let dois = []
            for(let art of articles) {
                articleViews += art.views
                articleDownloads += art.downloads
                if(art.doi && dois.indexOf(art.doi)<0) {
                    dois.push(art.doi)
                }
            }
            let statics = {
                directors: directors,
                chiefEditors: chiefEditors,
                managingEditors: managingEditors,
                editorials: editorials,
                institutesUniversities: institutesUniversities,
                authors: authors,
                articles: articles,
                articleViews: articleViews,
                articleDownloads: articleDownloads,
                cities: cities,
                countries: countries,
                dois: dois
            }
            return view.render('admin.admin', { isLogged: true, user: user, journals: journals, request_count: requestCount, statics: statics})
        }else if(user.group_id==2){
            let articles = await Artical.query().where('status', 'submitted').orderBy('created_at', 'desc').limit(10).fetch()
            let newlySubmitedArticles = articles.toJSON()
            articles = await Artical.query().where('status', 'under_review').orderBy('created_at', 'desc').limit(10).fetch()
            let underReviewArticles = articles.toJSON()
            articles = await Artical.query().where('status', 'published').orderBy('created_at', 'desc').limit(10).fetch()
            let publishedArticles = articles.toJSON()
            let users = await User.query().whereNotIn('group_id', [1, 2]).fetch()
            users = users.toJSON()
            let statics = {
                registeredUsers: users,
                managingEdiors: [],
                reviewers: [],
                institutesUniversities: [],
                authors: []
            }
            for(let user of users) {
                if(user.group_id==4) {
                    statics.managingEdiors.push(user)
                }else if(user.group_id==3) {
                    statics.reviewers.push(user)
                }else if(user.group_id==5) {
                    statics.authors.push(user)
                }
                if(user.university_institute && statics.institutesUniversities.indexOf(user.university_institute)<0) {
                    statics.institutesUniversities.push(user.university_institute)
                }
            }
            return view.render('admin.chiefeditor', { 
                isLogged: true, 
                user: user, 
                newlySubmitedArticles: newlySubmitedArticles,
                underReviewArticles: underReviewArticles,
                publishedArticles: publishedArticles,
                statics : statics
            })
        }else {
            session.put('msg', 'You Are Not Authorized to use Dashboard')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }
    }
}

module.exports = UserController
