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

Route.get('partners', 'JournalController.partners')

Route.get('keyword/:keyword', 'JournalController.keyword')


Route.any('artical_submission', 'ArticalController.create').as('artical_create')

Route.any('journal_artical_submission', 'ArticalController.createForJournal')

Route.any('article_id/:article_id', 'ArticalController.profile')

Route.any('article/:article_name', 'ArticalController.publish')



Route.post('login', 'UserController.login')

Route.post('signup', 'UserController.signup')

Route.get('logout', 'UserController.logout')

Route.get('admin', 'UserController.admin')

Route.any('author/:author_name', 'UserController.profile')

Route.any('profile/:author_id', 'UserController.profile')


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