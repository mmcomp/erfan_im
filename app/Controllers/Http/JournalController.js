'use strict'

const Country = use('App/Models/Country')
const Journal = use('App/Models/Journal')
const Database = use('Database')
const Helpers = use('Helpers')

class JournalController {
    async index ({ view, response, session }) {
        let isLogged = false
        let country = [], user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }else{
            isLogged = false
            country = await Country.all()
            country = country.toJSON()
        }
        let theFrequencies = ''
        let jours = ''
        let freqs = []
        let journals = await Journal.query().where('status', 'aproved').fetch()
        journals = journals.toJSON()
        console.log('Journals')
        console.log(journals)

        for(let i = 0;i < journals.length;i++) {
            console.log('Check', journals[i].frequency, freqs.indexOf(journals[i].frequency))
            if(freqs.indexOf(journals[i].frequency)<0) {
                freqs.push(journals[i].frequency)
            }

            jours += '<div class="cbp-item ' + journals[i].frequency + '">'
            jours += '<div class="cbp-caption">'
            jours += '<div class="cbp-caption-defaultWrap">'
            jours += '<img src="' + ((journals[i].cover_image_path)?journals[i].cover_image_path:'static/img/GnC-cover.jpg') + '" alt="">'
            jours += '</div>'
            jours += '<div class="cbp-caption-activeWrap">'
            jours += '<div class="c-masonry-border"></div>'
            jours += '<div class="cbp-l-caption-alignCenter"><div class="cbp-l-caption-body">'
            jours += '<a href="' + ((journals[i].web_site)?journals[i].web_site:'#') + '" class="cbp-singlePage cbp-l-caption-buttonLeft btn c-btn-square c-btn-border-1x c-btn-white c-btn-bold c-btn-uppercase">Journal Homepage</a>'
            jours += '<a href="' + ((journals[i].cover_image_path)?journals[i].cover_image_path:'static/img/GnC-cover.jpg') + '" class="cbp-lightbox cbp-l-caption-buttonRight btn c-btn-square c-btn-border-1x c-btn-white c-btn-bold c-btn-uppercase" data-title="Dashboard<br>by Paul Flavius Nechita">Journal Cover</a>'
            jours += '</div></div></div></div>'
            jours += '<a href="/journal_page/' + journals[i].id + '" class="cbp-singlePage cbp-l-grid-masonry-projects-title">' + journals[i].name + '</a>'
            jours += '<div class="cbp-l-grid-masonry-projects-desc">'
            jours += journals[i].issn
            jours += '</div></div>'
        }

        for(let i = 0;i < freqs.length;i++) {
            theFrequencies += '<div data-filter=".' + freqs[i] + '" class="cbp-filter-item">'
            theFrequencies += freqs[i]
            theFrequencies += '<div class="cbp-filter-counter">'
            theFrequencies += '</div>'
            theFrequencies += '</div>'
        }

        console.log('theFreq', theFrequencies)

        return view.render('journal.index', { isLogged: isLogged, frequencies: theFrequencies, jours: jours, country: country, user: user })
    }

    async create ({ view, response, session, request }) {
        let isLogged = false, user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
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
            if(isLogged) {
                user = session.get('user')
            }

            return view.render('journal.create', { 
                isLogged: isLogged, 
                country: JSON.stringify(theCountries), 
                city: JSON.stringify(city),
                countries: countries,
                plainCountries: JSON.stringify(plainCountries),
                user: user
            })
        }

        console.log('REQUEST: ', request.all())

        const coverImage = request.file('cover_image', {
            types: ['image'],
            size: '2mb'
        })
        let filename = `${new Date().getTime()}.${coverImage.subtype}`
        await coverImage.move(Helpers.publicPath('static/img/cover'), {
            name: filename,
            overwrite: true
        })

        if(!coverImage.moved()) {
            console.log(coverImage.error())
        }

        let journal = new Journal
        journal.name = request.all()['name']
        journal.issn = request.all()['issn']
        journal.frequency = request.all()['frequency']
        journal.publisher = request.all()['publisher']
        journal.city_id = request.all()['city_id']
        journal.description = request.all()['description']
        journal.contact_fname = request.all()['contact_fname']
        journal.contact_lname = request.all()['contact_lname']
        journal.contact_position = request.all()['contact_position']
        journal.communication_officer = request.all()['communication_officer']
        journal.tell = request.all()['tell']
        journal.email = request.all()['email']
        journal.web_site = request.all()['web_site']
        journal.cover_image_path = 'static/img/cover/' + filename


        await journal.save()


        
        // return view.render('journal.index', { isLogged: isLogged })
        return response.route('journals', {isLogged: isLogged})
    }

    async profile ({ view, response, session, request, params }) {
        console.log('Params', params)
        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }
        let theJournal = await Journal.find(params.journal_id)
        if(!theJournal) {
            session.put('msg', 'Journal Not Found')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }

        
        return view.render('journal.profile', { isLogged: isLogged, user: user, title: theJournal.name, journal: theJournal.toJSON()})
    }
}

module.exports = JournalController