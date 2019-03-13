'use strict'

const Country = use('App/Models/Country')
const User = use('App/Models/User')
const Journal = use('App/Models/Journal')
const Artical = use('App/Models/Artical')
const UserArticle = use('App/Models/UserArticle')
const UserKeyword = use('App/Models/UserKeyword')
const Database = use('Database')
const docx = require('./docx')
const Randomatic = require('randomatic')

class UserController {
    async logout ({ auth, response, session }) {
        // console.log('Log Out')
        session.clear()
        // console.log('session', session.all())
        try{
            await auth.logout()
        }catch(e) {

        }
        // return view.render('main.index')
        return response.redirect('/')
    }

    async login ({ request, auth, response, session }) {
        try{
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
                    // console.log('Remember Me : ', rememberme)
                    await auth.remember(rememberme).attempt(email, password)
                    msg = 'Logged in successfully'
                    logedIn = true;

                    let user = await User.query().where('id', auth.user.id).with('permissions').first()
                    // console.log('User', user.toJSON())
                    user = user.toJSON()
                    let permissions = {}
                    for(let i = 0;i < user.permissions.length;i++) {
                        permissions[user.permissions[i].permission_key] = true
                    }
                    user.permissions = permissions
                    // console.log(user)
                    session.put('user', user)
                    
                }catch(e) {
                    // console.log('Login Error')
                    // console.log(e)
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
        }catch(e){
            console.log(e)
            session.put('msg', 'try again please')
            session.put('msg_type', 'danger')

            return response.route('home', {message: msg, isLogged: logedIn})
        }
    }

    async forget ({ request, auth, response, session }) {
        if(!request.all()['forget_email']){
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.route('home')
        }

        let user = await User.query().where('email', request.all()['forget_email']).first()
        if(!user) {
            session.put('msg', 'Email not found!')
            session.put('msg_type', 'danger')
            return response.route('home')
        }
        try{
            let password = Randomatic('*', 8)
            user.password = password
            await user.save()
            let mailResult = await docx.sendMail(user.email, 'Reset Password', 'Your new password is ' + password, `<h1>iMaqPress</h1>
            <p>Dear ${ user.fname } ${ user.lname }<br/>
            You can temporarily sign in with this email and <b>${ password }</b> as your password.
            `)
            console.log('Mail Result', mailResult)
            session.put('msg', 'Email sent to you with reset password details.')
            session.put('msg_type', '')
            return response.route('home')
        }catch(e) {
            session.put('msg', 'Error sending reset password to you!')
            session.put('msg_type', 'danger')
            return response.route('home')
        }
    }

    async googleLogin ({ ally, request, auth, response, session }) {
        const guser = await ally.driver('google').getUser()
        console.log(guser)
        let lname = guser._original.name.split(' ')
        let fname = ''
        if(lname.length>1) {
            lname = lname[lname.length-1]
            fname = guser._original.name.replace(' ' + lname, '')
        }
        
        let user = await User.query().where('email', guser._original.email).first()
        if(!user) {
            user = new User
            user.email = guser._original.email
            user.fname = fname
            user.lname = lname
            user.password = '123456'
            await user.save()
        }

        await auth.login(user)
        let msg = 'Logged in successfully'

        user = await User.query().where('id', auth.user.id).with('permissions').first()

        user = user.toJSON()
        let permissions = {}
        for(let i = 0;i < user.permissions.length;i++) {
            permissions[user.permissions[i].permission_key] = true
        }
        user.permissions = permissions

        session.put('user', user)

        return response.route('home', {message: msg, isLogged: true})
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

        let journals = await Journal.query().where('status', 'aproved').fetch()
        journals = journals.toJSON()

        let articles = await Artical.query().with('journal').where('status', 'published').orderBy('citiations', 'desc').limit(3).fetch()
        articles = articles.toJSON()
        for(let i = 0;i < articles.length;i++) {
            if(articles[i].abstract && articles[i].abstract.split(" ").length>30) {
                articles[i].abstract = articles[i].abstract.split(" ").splice(0,30).join(" ") + '...'
            }
        }

        let editorCount = await Database.raw('select count(id) as c from (select id from users_edits group by users_id) tb1')
        editorCount = editorCount[0][0].c

        let articleCount = await Database.raw('select count(*) c from article')
        articleCount = articleCount[0][0].c

        let citationCount = await Database.raw('select sum(citiations) c from article')
        citationCount = citationCount[0][0].c

        let authorCount = await Database.raw('select count(*) c from users')
        authorCount = authorCount[0][0].c

        let msg = session.get('msg')
        let msg_type = (session.get('msg_type')?session.get('msg_type'):'')
        session.forget('msg')
        session.forget('msg_type')
        if(loggedIn) {
            user = session.get('user')
        }

        return view.render('main.index', { 
            isLogged: loggedIn, 
            msg: msg, 
            msg_type:msg_type, 
            country: country, 
            user: user,
            journals: journals,
            articles: articles,
            editorCount: editorCount,
            articleCount: articleCount,
            citationCount: citationCount,
            authorCount: authorCount
        })
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

        let keywords = request.all()['keywords']
        if(keywords!='' && keywords) {
            keywords = keywords.split(',')
            let insertArray = []
            for(let i = 0;i < keywords.length;i++) {
                insertArray.push({
                    users_id: user.id,
                    keyword: keywords[i]
                })
            }
            await UserKeyword.createMany(insertArray)
        }

        session.put('msg', 'You are Signed Up. Now you can Login with you email and password')

        try{
            let mailResult = await docx.sendMail(user.email, 'Welcome to iMaqPress', 
                `<h1>iMaqPress</h1>
                <p>
                Dear ${ user.fname } ${ user.lname }<br/>
                You account has created on iMaqPress. Please sign in the <a href="${ Env.get('APP_URL') }">iMaqPress</a> 
                with this email and the password you provided before.<br/>
                </p>`)
        }catch(e) {
            console.log('Send Mail Error')
            console.log(e)
        }

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
            let assocEditors = []
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
                }else if(theUser.group_id == 6) {
                    assocEditors.push(theUser)
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
            let articleCitations = 0
            let dois = []
            for(let art of articles) {
                articleViews += art.views
                articleDownloads += art.downloads
                articleCitations += art.citiations
                if(art.doi && dois.indexOf(art.doi)<0) {
                    dois.push(art.doi)
                }
            }
            let statics = {
                directors: directors,
                chiefEditors: chiefEditors,
                assocEditors: assocEditors,
                managingEditors: managingEditors,
                editorials: editorials,
                institutesUniversities: institutesUniversities,
                authors: authors,
                articles: articles,
                articleViews: articleViews,
                articleDownloads: articleDownloads,
                articleCitations: articleCitations,
                cities: cities,
                countries: countries,
                dois: dois
            }
            return view.render('admin.admin', { 
                isLogged: true, 
                user: user, 
                journals: journals, 
                request_count: requestCount, 
                statics: statics,
            })
        }else if(user.group_id==2){
            let cities = [], countries = []
            let journals = await Journal.all()
            journals = journals.toJSON()
            for(let jour of journals) {
                if(cities.indexOf(jour.city_id)<0) {
                    cities.push(jour.city_id)
                }
            }
            console.log('Cities', cities)
            let articles = await Artical.all()
            articles = articles.toJSON()
            let newlySubmitedArticles = [], underReviewArticles = [], publishedArticles = [], articleViews = 0
            let articleDownloads = 0, articleCitiations = 0
            for(let art of articles) {
                if(art.status == 'submitted') {
                    newlySubmitedArticles.push(art)
                }else if(art.status == 'published') {
                    publishedArticles.push(art)
                    articleViews += art.views
                    articleDownloads += art.downloads
                    articleCitiations += art.citiations
                }else {// if(art.status == 'under_review') {
                    underReviewArticles.push(art)
                }
            }
            console.log('ArticleViews', articleViews)
            let users = await User.query().whereNotIn('group_id', [1, 2]).fetch()
            users = users.toJSON()
            let statics = {
                registeredUsers: users,
                managingEdiors: [],
                assocEditors: [],
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
                }else if(user.group_id==6) {
                    statics.assocEditors.push(user)
                }
                if(user.university_institute && statics.institutesUniversities.indexOf(user.university_institute)<0) {
                    statics.institutesUniversities.push(user.university_institute)
                }
                if(countries.indexOf(user.country_id)<0) {
                    countries.push(user.country_id)
                }
            }
            console.log('Countries', countries)
            let msg = session.get('msg')
            let msg_type = session.get('msg_type')
            session.forget('msg')
            session.forget('msg_type')
            return view.render('admin.chiefeditor', { 
                isLogged: true, 
                user: user, 
                articles: articles,
                articleViews: String(articleViews),
                articleDownloads: String(articleDownloads),
                articleCitiations: String(articleCitiations),
                newlySubmitedArticles: newlySubmitedArticles,
                underReviewArticles: underReviewArticles,
                publishedArticles: publishedArticles,
                acceptedArticles: [],
                rejectedArticles: [],
                invitedArticles: newlySubmitedArticles,
                statics : statics,
                cities: cities,
                countries: countries,
                msg: msg,
                msg_type: msg_type,
            })
        }else if(user.group_id==5){
            return response.redirect('/profile/' + user.id)
        }else {
            session.put('msg', 'You Are Not Authorized to use Dashboard')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }
    }

    async profile ({ request, auth, view, response, session, params }) {
        let user = session.get('user')
        // console.log('params', params)
        if(!params) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/') 
        }
        let selected_user
        if(params.author_name) {
            let author_name = params.author_name.split('-')
            // console.log('Author Name', author_name, author_name.length)
            let fname = (author_name.length==2)?author_name[0]:''
            let lname = (author_name.length==2)?author_name[1]:author_name[0]
            // console.log('Fname', fname, 'Lname', lname)
            selected_user = await User.query().where('fname', fname).where('lname', lname).first()
        }else if(params.author_id) {
            selected_user = await User.find(params.author_id)
        }else {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/') 
        }

        if(!selected_user) {
            session.put('msg', 'Author Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }

        if(request.all()['email']) {
            selected_user.email = request.all()['email']
            selected_user.academic_page = request.all()['academic_page']
            selected_user.group_id = request.all()['group_id']
            await selected_user.save()
        }

        let pageNumber = 1
        if(request.all()['page_number']) {
            pageNumber = parseInt(request.all()['page_number'],10)
            if(isNaN(pageNumber)) {
                pageNumber = 1
            }
        }
        if(request.all()['page_move']) {
            let page_move = parseInt(request.all()['page_move'],10)
            if(!isNaN(page_move) && (pageNumber + page_move) >= 1) {
                pageNumber += page_move
            }
        }
        let articleIds = []
        let articles = await Artical.query().where('author_id', selected_user.id).with('journal').with('comments').orderBy('created_at', 'desc').paginate(pageNumber, 10)
        let recentPublished = articles.toJSON()
        for(let tmp of recentPublished.data) {
            if(articleIds.indexOf(tmp.id)<0) {
                articleIds.push(tmp.id)
            }
        }
        recentPublished['pages'] = []
        for(let i = 1;i <= recentPublished.lastPage;i++) {
            recentPublished.pages.push(i)
        }
        articles = await Artical.query().where('author_id', selected_user.id).with('journal').with('comments').orderBy('citiations', 'desc').paginate(pageNumber, 10)
        let highlyCited = articles.toJSON()
        for(let tmp of highlyCited.data) {
            if(articleIds.indexOf(tmp.id)<0) {
                articleIds.push(tmp.id)
            }
        }
        highlyCited['pages'] = []
        for(let i = 1;i <= highlyCited.lastPage;i++) {
            highlyCited.pages.push(i)
        }
        let userArticles = await UserArticle.query().with('user').whereIn('article_id', articleIds).fetch()
        userArticles = userArticles.toJSON()
        console.log('Recently : ', recentPublished)
        return view.render('admin.user', {
            isLogged: true, 
            user: user, 
            selected_user: selected_user,
            articles : {
                recentPublished: recentPublished,
                highlyCited: highlyCited
            },
            user_articles: userArticles,
        })
    }

    async emailExists ({ request, auth, view, response, session, params }) {
        let result = false
        if(params.email) {
            let user  = await User.query().where('email', params.email).first()
            if(!user) {
                result = true
            }
        }
        return {
            result: result
        }
    }
}

module.exports = UserController
