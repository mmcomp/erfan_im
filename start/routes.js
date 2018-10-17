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

Route.any('artical_submission', 'ArticalController.create').as('artical_create')

Route.post('login', 'UserController.login')

Route.post('signup', 'UserController.signup')

Route.get('logout', 'UserController.logout')

Route.get('admin', 'UserController.admin')

Route.get('jouranl_request/:journal_id', 'JournalController.profile')

Route.get('/', 'UserController.home').as('home')

Route.get('*', 'UserController.home')

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