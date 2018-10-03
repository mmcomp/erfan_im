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

Route.get('journals', 'JournalController.index')

Route.post('login', 'UserController.login')

Route.get('logout', 'UserController.logout')


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
/*
Route.get('/:v', async ({ params, view }) => {
    console.log('params')
    console.log(params)
    view.share(params)
    return view.render('index')
})
*/
/*
Route.get('/index.html', async ({ view, auth }) => {
    let loggedIn = true
    try{
        await auth.check()
    }catch(e) {
        loggedIn = false
    }

    return view.render('main.index', { isLogged: loggedIn})
})
Route.get('/Imaqjournals.html', ({ view }) => {
    return view.render('pages.imaqjournals')
})
Route.get('/iMaQBlog.html', ({ view }) => {
    return view.render('pages.iMaQBlog')
})
*/
// Route.on('/').render('welcome')
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