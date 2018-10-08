'use strict'

const Country = use('App/Models/Country')
const City = use('App/Models/City')
const Database = use('Database')

class JournalController {
    async index ({ view, response, session }) {
        let isLogged = false
        if(session.get('user')) {
            isLogged = true
        }
        return view.render('journal.index', { isLogged: isLogged })
    }

    async create ({ view, response, session, request }) {
        let isLogged = false
        if(session.get('user')) {
            isLogged = true
        }

        if(request.method()=='GET') {
            console.log('GET')
            console.log(request.all())

            let country = await Country.all()//query().with('cities').fetch()

            country = country.toJSON()
            
            let theCountries = {}
            for(let i = 0;i < country.length;i++) {
                theCountries[country[i].COUNTRY_NAME] = country[i].id
            }

            let plainCountries = []
            for(let i = 0;i < country.length;i++) {
                plainCountries.push(country[i].COUNTRY_NAME)
            }

            let countries = '<option></option>'
            for(let i = 0;i < country.length;i++) {
                countries += '<option value="' + country[i].id + '">' + country[i].COUNTRY_NAME + '</option>';
            }

            let city = []

            if(request.all()['country_id'] && request.all()['city_name']) {
                // let city = await City.query().where('country_id', request.all()['country_id']).fetch()
                let thQuery = "select * from city where country_id = '" + request.all()['country_id'] + "' and FULL_NAME_ND like '%" + request.all()['city_name'] + "%'"
                console.log(thQuery)
                let city = await Database.raw(thQuery)
                // if(city) {
                //     city = city.toJSON()
                // }
                return city
            }

            return view.render('journal.create', { 
                isLogged: isLogged, 
                country: JSON.stringify(theCountries), 
                city: JSON.stringify(city),
                countries: countries,
                plainCountries: JSON.stringify(plainCountries)
            })
        }

        console.log('REQUEST: ', request.all())
        return view.render('journal.create', { isLogged: isLogged })
    }
}

module.exports = JournalController