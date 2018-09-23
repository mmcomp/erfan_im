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

Route.get('/', ({ view }) => {
    return view.render('index')
})
/*
Route.get('/:v', async ({ params, view }) => {
    console.log('params')
    console.log(params)
    view.share(params)
    return view.render('index')
})
*/
Route.get('/index.html', ({ view }) => {
    return view.render('index')
})
Route.get('/Imaqjournals.html', ({ view }) => {
    return view.render('imaqjournals')
})
Route.get('/iMaQBlog.html', ({ view }) => {
    return view.render('iMaQBlog')
})
// Route.on('/').render('welcome')
