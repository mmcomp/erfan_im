'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URL's and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {import('@adonisjs/framework/src/Route/Manager'} */
const Route = use('Route')

/*
Route
  .get('users/:id', 'UserController.show')
  .middleware('auth')
*/

Route.get('journals', 'JournalController.index').as('journals')

Route.any('journal_submission', 'JournalController.create').as('journal_create')

Route.any('jouranl_request/:journal_id', 'JournalController.profile')

Route.any('jouranl/:journal_name', 'JournalController.profileByName')

Route.any('jouranls/:journal_name/:issn', 'JournalController.profileByName')

Route.post('journal_remove', 'JournalController.remove')

Route.get('partners', 'JournalController.partners')

Route.any('keyword/:keyword', 'JournalController.keyword')


Route.any('artical_submission', 'ArticalController.create').as('artical_create')

Route.any('journal_artical_submission/:journal_id', 'ArticalController.createForJournal')

Route.any('article_id/:article_id', 'ArticalController.profile')

Route.any('article/:article_name', 'ArticalController.publish')

Route.any('keyword_check/:journal_id', 'ArticalController.keywordCheck')


Route.get('test/:id', 'UserController.test')

Route.post('login', 'UserController.login')

Route.post('signup', 'UserController.signup')

Route.get('logout', 'UserController.logout')

Route.get('admin', 'UserController.admin')

Route.any('author/:author_name', 'UserController.profile')

Route.any('profile/:author_id', 'UserController.profile')

Route.get('aboutus', 'UserController.aboutUs')

Route.any('privacy', async ({view, session}) => {
    let loggedIn = true, user = {}
    if(session.get('user')) {
        user = session.get('user')
        loggedIn = true
    }
    return view.render('components.privacy', { isLogged: loggedIn, user: user })
})

Route.any('developer', async ({view, session}) => {
    let loggedIn = true, user = {}
    if(session.get('user')) {
        user = session.get('user')
        loggedIn = true
    }
    return view.render('components.mehrdad', { isLogged: loggedIn, user: user })
})

Route.any('email', 'ArticalController.email')

Route.get('pdf/:article_id', 'ArticalController.pdf')

Route.get('genpdf/:article_id', 'ArticalController.test')

Route.get('epub/:article_id', 'ArticalController.epub')

Route.get('endnote/:article_id', 'ArticalController.endnote')

Route.get('google', async ({ ally }) => {
    await ally.driver('google').redirect()
})

Route.get('authenticated/google', 'UserController.googleLogin')

Route.post('forget', 'UserController.forget')

Route.get('email_exists/:email', 'UserController.emailExists')

Route.get('/', 'UserController.home').as('home')

Route.get('*', async ({response, session}) => {
    session.put('msg', 'URL not found')
    session.put('msg_type', 'danger')
    return response.redirect('/')
})

/*
Route.get('/', async ({ view, auth, request, session }) => {
    let loggedIn = true
    try{
        await auth.check()
    }catch(e) {
        loggedIn = false
    }

    console.log(session.all())
    let msg = session.get('msg')
    session.forget('msg')

    return view.render('main.index', { isLogged: loggedIn, msg: msg})
}).as('home')

Route.any('*', async ({ view, auth }) => {
    let loggedIn = true
    try{
        await auth.check()
    }catch(e) {
        loggedIn = false
    }

    console.log(session.all())
    let msg = session.get('msg')
    session.forget('msg')

    return view.render('main.index', { isLogged: loggedIn, msg: msg})
})
*/