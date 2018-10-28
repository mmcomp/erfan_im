'use strict'

const Artical = use('App/Models/Artical')
const Journal = use('App/Models/Journal')
const Helpers = use('Helpers')

class JournalController {
    async index ({ view, response, session }) {
        let isLogged = false
        if(session.get('user')) {
            isLogged = true
        }
        let theFrequencies = ''
        let jours = ''
        let freqs = []
        let journals = await Journal.all()
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

        return view.render('journal.index', { isLogged: isLogged, frequencies: theFrequencies, jours: jours })
    }

    async create ({ view, response, session, request }) {
        let isLogged = false, user = {}, msg = '', msg_type = ''
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
            msg = session.get('msg')
            msg_type = session.get('msg_type')
            session.forget('msg')
            session.forget('msg_type')
        }else {
            session.put('msg', 'You need to Login first')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        if(request.method()=='GET') {
            let journals = await Journal.all()
            let theJournalId  = (request.all()['thejournal_id'])?parseInt(request.all()['thejournal_id'],10):-1

            return view.render('artical.create', { 
                isLogged: isLogged,
                user: user,
                msg: msg,
                msg_type: msg_type,
                journals: journals.toJSON(),
                thejournal_id: theJournalId
            })
        }else {
            console.log('Request', request.all())
            let artical = new Artical
            artical.abstract_image_path = ''
            const abstractImagePath = request.file('abstract_image_path', {
                types: ['image'],
                size: '2mb'
            })
            let filename = `${new Date().getTime()}.${abstractImagePath.subtype}`
            await abstractImagePath.move(Helpers.publicPath('static/img/abstract'), {
                name: filename,
                overwrite: true
            })
    
            if(!abstractImagePath.moved()) {
                console.log(abstractImagePath.error())
                let error = abstractImagePath.error()
                session.put('msg', 'Abstract Image Error : ' + error.message)
                session.put('msg_type', 'danger')

                return response.route('artical_create')
            }else {
                artical.abstract_image_path = 'static/img/abstract/' + filename
            }
    
            artical.file_path = ''
            const filePath = request.file('file_path', {
                size: '10mb'
            })

            filename = `${new Date().getTime()}.${filePath.clientName.split('.')[filePath.clientName.split('.').length-1]}`
            await filePath.move(Helpers.publicPath('static/articals'), {
                name: filename,
                overwrite: true
            })
    
            if(!filePath.moved()) {
                console.log(filePath.error())
                let error = filePath.error()
                session.put('msg', 'Article File Error : ' + error.message)
                session.put('msg_type', 'danger')

                return response.route('artical_create')
            }else {
                artical.file_path = 'static/articals/' + filename
            }

            artical.type = (request.all()['type_research'])?'research':'non-research'
            artical.full_title = request.all()['full_title']
            artical.running_title = request.all()['running_title']
            artical.summery = request.all()['summery']
            // artical.author_id = user.id
            await artical.save()

            session.put('msg', 'Article Save Successfully.')
            session.put('msg_type', '')
        }
        return response.route('home', {isLogged: isLogged})
    }

    async profile ({ view, response, session, request, params }) {
        let isLogged = false, user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        console.log('Params', params)
        if(!params || !params.article_id || isNaN(parseInt(params.article_id, 10))) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }
        let article = await Artical.find(parseInt(params.article_id, 10))
        if(!article) {
            session.put('msg', 'Article Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/admin')
        }
        article = article.toJSON()
        let status_color = 'primary'
        if(article.status == 'published') {
            status_color = 'success'
        }else if(article.status == 'rejected') {
            status_color = 'danger'
        }
        return view.render('artical.profile', {isLogged: isLogged, user:user, article: article, status_color: status_color})
    }
}

module.exports = JournalController