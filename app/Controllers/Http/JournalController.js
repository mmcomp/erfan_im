'use strict'

const Country = use('App/Models/Country')
const Journal = use('App/Models/Journal')
const ArticleKeyword = use('App/Models/ArticleKeyword')
const JournalExtra = use('App/Models/JournalExtra')
const JournalKeyword = use('App/Models/JournalKeyword')
const Database = use('Database')
const Helpers = use('Helpers')
const User = use('App/Models/User')
const Artical = use('App/Models/Artical')
const UserArticle = use('App/Models/UserArticle')
const Partner = use('App/Models/Partner')
const docx = require('./docx')
const NodePie = require("nodepie")
const axios = require('axios')

class JournalController {
    async index ({ view, session }) {
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
            jours += '<div class="cbp-l-grid-masonry-projects-desc">'
            jours += '<b><a href="/jouranls/' + journals[i].name.replace(/ /g, '-') + '/' + journals[i].issn + '">' + journals[i].name + '</a></b><br/>'
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

        return view.render('journal.index', { 
            isLogged: isLogged, 
            frequencies: theFrequencies, 
            jours: jours, 
            country: country, 
            user: user,
        })
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
                user: user,
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

        try{
            let mailResult = await docx.sendMail(journal.email, journal.name + ' Journal Submitted Succefully', 
                `<h1>iMaqPress</h1>
                <p>
                Dear ${ journal.contact_fname } ${ journal.contact_lname }<br/>
                You jornal as <b>${ journal.name }</b> submitted on iMaqPress. We will review your journal as soon as possible and will contact you later on this 
                email or this <b>${ journal.tell }.</b> .<br/>
                </p>`)
        }catch(e) {
            console.log('Send Mail Error')
            console.log(e)
        }
        
        // return view.render('journal.index', { isLogged: isLogged })
        return response.route('journals', {isLogged: isLogged})
    }

    async profileByName ({ view, response, session, request, params }) {
        if(!params || !params.journal_name || params.journal_name=='') {
            session.put('msg', 'Journal Name Is Not Valid')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }

        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        params.journal_name = params.journal_name.replace(/-/g, ' ')
        let theJournal = await Journal.query().with('extra').with('keyword').where('name', params.journal_name).first()
        if(!theJournal) {
            session.put('msg', 'Journal Not Found')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }

        if(params.issn && params.issn!=theJournal.issn) {
            session.put('msg', 'Journal with this ISSN Not Found')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }
        session.put('selected_journal', theJournal.id)
        
        let uploadedImage = '', selected_editor = -1
        var c1 = [], c2 = [], c3 = []
        let theJournalData = theJournal.toJSON()
        // console.log('TheJournalData', theJournalData)
        for(let i = 0;i < theJournalData.keyword.length;i++) {
            if(theJournalData.keyword[i].category=='c1') {
                c1.push(theJournalData.keyword[i].theword)
            }else if(theJournalData.keyword[i].category=='c2') {
                c2.push(theJournalData.keyword[i].theword)
            }else if(theJournalData.keyword[i].category=='c3') {
                c3.push(theJournalData.keyword[i].theword)
            }
        }
        // console.log('c1', c1)
        //----ARTICLES
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
        let searchTitle = ''
        if(request.all()['search_articles']){
            searchTitle = request.all()['search_articles']
        }
        let sort = 'created_at';
        if(request.all()['sort']){
            sort = request.all()['sort']
            console.log('Sort By', sort)
        }
        let articleIds = []
        let articles = await Artical.query().where(function () {
            if(searchTitle!='') {
                this
                .where('running_title', 'like', '%' + searchTitle + '%')
                .orWhere('full_title', 'like', '%' + searchTitle + '%')
            }
          }).where('journal_id', theJournal.id).where('status', 'published').with('journal').with('comments').orderBy(sort, 'desc').paginate(pageNumber, 10)
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
        sort = 'citiations';
        if(request.all()['sort']){
            sort = request.all()['sort']
            console.log('Sort By', sort)
        }
        articles = await Artical.query().where(function () {
            if(searchTitle!='') {
                this
                .where('running_title', 'like', '%' + searchTitle + '%')
                .orWhere('full_title', 'like', '%' + searchTitle + '%')
            }
          }).where('journal_id', theJournal.id).where('status', 'published').with('journal').with('comments').orderBy(sort, 'desc').paginate(pageNumber, 10)
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
        //\---ARTICLES
        if(request.method()=='GET') {
            if(theJournal.status == 'requested') {
                theJournal.status = 'pending'
                await theJournal.save()
            }
        }else {
            // console.log('POST Request', request.all())
            if(request.all()['status']) {
                theJournal.director_note = request.all()['director_note']
                theJournal.status = request.all()['status']
                theJournal.doi_code = request.all()['doi_code']
                theJournal.issn = request.all()['issn']
                await theJournal.save()    
            }else if(request.all()['tabdata']) {
                let tbdata = []
                try{
                    tbdata = JSON.parse(request.all()['tabdata'])
                }catch(e){
                    console.log('json parse error', e)
                }
                await JournalExtra.query().where('journal_id', theJournal.id).delete()
                if(tbdata.length>0) {
                    await JournalExtra.createMany(tbdata)
                    console.log('saveing tb data', tbdata)
                }
                theJournal.google_indexes = request.all()['google_indexes']
                theJournal.name = request.all()['name']
                theJournal.description = request.all()['description']
                await theJournal.save()
                let categorys = []
                c1 = request.all()['c1'].split(',')
                if(c1[0]!='') {
                    for(let i =0;i < c1.length;i++) {
                        categorys.push({
                            category: 'c1',
                            journal_id: theJournal.id,
                            theword: c1[i]
                        })
                    }
                }
                c2 = request.all()['c2'].split(',')
                if(c2[0]!='') {
                    for(let i =0;i < c2.length;i++) {
                        categorys.push({
                            category: 'c2',
                            journal_id: theJournal.id,
                            theword: c2[i]
                        })
                    }
                }
                c3 = request.all()['c3'].split(',')
                if(c3[0]!='') {
                    for(let i =0;i < c3.length;i++) {
                        categorys.push({
                            category: 'c3',
                            journal_id: theJournal.id,
                            theword: c3[i]
                        })
                    }
                }
                await JournalKeyword.query().where('journal_id', theJournal.id).delete()
                if(categorys.length>0) {
                    await JournalKeyword.createMany(categorys)
                }
                theJournal = await Journal.query().with('extra').where('id', theJournal.id).first()

            }else if(request.file('image_upload')) {
                const imageUpload = request.file('image_upload', {
                    types: ['image'],
                    size: '2mb'
                })
                selected_editor = request.all()['selected_editor']
                let filename = `${new Date().getTime()}.${imageUpload.subtype}`
                await imageUpload.move(Helpers.publicPath('static/img/uploads'), {
                    name: filename,
                    overwrite: true
                })
                if(!imageUpload.moved()) {
                    console.log(imageUpload.error())
                }else {
                    uploadedImage = '/static/img/uploads/' + filename
                }
            }else if(request.file('cover_image_path')) {
                const imageUpload = request.file('cover_image_path', {
                    types: ['image'],
                    size: '2mb'
                })
                let filename = `${new Date().getTime()}.${imageUpload.subtype}`
                await imageUpload.move(Helpers.publicPath('static/img/cover'), {
                    name: filename,
                    overwrite: true
                })
                if(!imageUpload.moved()) {
                    console.log(imageUpload.error())
                }else {
                    theJournal.cover_image_path = 'static/img/cover/' + filename
                    await theJournal.save()
                }
            }else if(request.file('pdf_image_path')) {
                const imageUpload = request.file('pdf_image_path', {
                    types: ['image'],
                    size: '2mb'
                })
                let filename = `${new Date().getTime()}.${imageUpload.subtype}`
                await imageUpload.move(Helpers.publicPath('static/img/cover'), {
                    name: filename,
                    overwrite: true
                })
                if(!imageUpload.moved()) {
                    console.log(imageUpload.error())
                }else {
                    theJournal.pdf_image_path = 'static/img/cover/' + filename
                    await theJournal.save()
                }
            }
        }

        return view.render('journal.profile', { 
            isLogged: isLogged, 
            user: user, 
            title: theJournal.name, 
            journal: theJournal.toJSON(),
            uploadedImage: uploadedImage,
            selected_editor: selected_editor,
            c1: c1,
            c2: c2,
            c3: c3,
            articles : {
                recentPublished: recentPublished,
                highlyCited: highlyCited
            },
        })
    }

    async profile ({ view, response, session, request, params }) {
        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }
        let theJournal = await Journal.query().with('extra').where('id', params.journal_id).first()
        if(!theJournal) {
            session.put('msg', 'Journal Not Found')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }
        
        let uploadedImage = '', selected_editor = -1

        if(request.method()=='GET') {
            if(theJournal.status == 'requested') {
                theJournal.status = 'pending'
                await theJournal.save()
            }
        }else {
            // console.log('POST Request', request.all())
            if(request.all()['status']) {
                theJournal.director_note = request.all()['director_note']
                theJournal.status = request.all()['status']
                theJournal.doi_code = request.all()['doi_code']
                await theJournal.save()    
            }else if(request.all()['tabdata']) {
                let tbdata = []
                try{
                    tbdata = JSON.parse(request.all()['tabdata'])
                }catch(e){
                    console.log('json parse error', e)
                }
                if(tbdata.length>0) {
                    await JournalExtra.query().where('journal_id', theJournal.id).delete()
                    await JournalExtra.createMany(tbdata)
                    console.log('saveing tb data', tbdata)
                }
                theJournal.google_indexes = request.all()['google_indexes']
                theJournal.name = request.all()['name']
                theJournal.description = request.all()['description']
                await theJournal.save()
                theJournal = await Journal.query().with('extra').where('id', theJournal.id).first()
            }else if(request.file('image_upload')) {
                const imageUpload = request.file('image_upload', {
                    types: ['image'],
                    size: '2mb'
                })
                selected_editor = request.all()['selected_editor']
                let filename = `${new Date().getTime()}.${imageUpload.subtype}`
                await imageUpload.move(Helpers.publicPath('static/img/uploads'), {
                    name: filename,
                    overwrite: true
                })
                if(!imageUpload.moved()) {
                    console.log(imageUpload.error())
                }else {
                    uploadedImage = '/static/img/uploads/' + filename
                }
            }
        }

        return view.render('journal.profile', { 
            isLogged: isLogged, 
            user: user, 
            title: theJournal.name, 
            journal: theJournal.toJSON(),
            uploadedImage: uploadedImage,
            selected_editor: selected_editor
        })
    }

    async partner ({ request, auth, view, response, session, params }) {
        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        const partnerName = decodeURIComponent(params.partner)
        let thePartner = await Partner.query().where('name', partnerName).with('user').first()
        if(!thePartner) {
            thePartner = new Partner
            thePartner.name = partnerName
            await thePartner.save()
        }
        console.log('method', request.method())
        if(request.method()=='POST') {
            let officer
            if(request.input('officer')) {
                officer = await User.query().where('email', request.input('officer')).first()
                if(!officer) {
                    officer = new User
                    officer.university_institute = thePartner.name
                    officer.fname = 'Officer of'
                    officer.lname = thePartner.name
                    officer.email = request.input('officer')
                    await officer.save()
                }
            }
            thePartner.url = request.input('url', '')
            thePartner.description = request.input('description', '')
            thePartner.rss = request.input('rss', null)
            if(officer) {
                thePartner.officer_id = officer.id
            }
            await thePartner.save()
            thePartner = await Partner.query().where('id', thePartner.id).with('user').first()
        }
        let feedData = []
        if(thePartner.rss && thePartner.rss!='') {
            try {
                const res = await axios(thePartner.rss)
                let xml, feed
                xml = res.data
                feed = new NodePie(xml)
                feed.init()
                // console.log(feed.getTitle());
                feed.getItems(0, 3).forEach(function(item){
                  // console.log(item.getTitle());
                  // console.log(feed.getPermalink());
                  feedData.push({
                    title: item.getTitle(),
                    link: item.getPermalink()
                  })
                })
                console.log('Feed Data', feedData)   
            }catch(e) {
                console.log('Rss Error', e)
            }
        }

        let partner = thePartner.toJSON()
        // console.log('The Partner', partner)
        let top_users = await Database.raw(`select id uid, users.*, (select count(*) from users_article where users_id = uid) aid from users where university_institute = '${ partnerName }' and status = 'enabled'`)
        top_users = top_users[0]
        const userIds = await User.query().where('university_institute', partnerName).pluck('id')
        // console.log('top users')
        // console.log(top_users)

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
        let otherUserArticles = await UserArticle.query().whereIn('users_id', userIds).pluck('article_id')

        let articles = await Artical.query().where('status', 'published')/*.where('author_id', selected_user.id)*/.whereIn('id', otherUserArticles).with('journal').with('comments').orderBy('created_at', 'desc').paginate(pageNumber, 10)
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
        articles = await Artical.query().where('status', 'published')/*.where('author_id', selected_user.id)*/.whereIn('id', otherUserArticles).with('journal').with('comments').orderBy('created_at').paginate(pageNumber, 10)
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

        let citation = await Artical.query().whereIn('id', articleIds).sum('citiations')
        citation = citation[0]['sum(`citiations`)']
        // console.log('citation', citation)

        return view.render('journal.partner', {
            top_users,
            partner,
            isLogged: isLogged,
            user: user,
            partners: [partner],
            number_of_articles: articleIds.length,
            number_of_authers: userIds.length,
            number_of_citiations: citation,
            articles : {
                recentPublished: recentPublished,
                highlyCited: highlyCited,
            },
            user,
            feedData,
        })
    }

    async partners ({ request, auth, view, response, session, params }) {
        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        let partners = await User.query().where('status', 'enabled').with('country').groupBy('university_institute').fetch()
        partners =  partners.toJSON()
        
        console.log('Partners')
        console.log(partners)

        return view.render('journal.partners', {
            isLogged: isLogged,
            user: user,
            partners: partners,
        })
    }

    async keyword ({ request, auth, view, response, session, params }) {
        if(!params || !params.keyword) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
    
            return response.route('home')
        }

        let isLogged = false
        let user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        let journalKeyword = await JournalKeyword.query().where('theword', params.keyword).first()

        if(!journalKeyword) {
            session.put('msg', 'KeyWord Not Used')
            session.put('msg_type', 'danger')

            return response.route('home')
        }

        let articleKeyword = await ArticleKeyword.query().where('journal_keywords_id', journalKeyword.id).fetch()
        articleKeyword = articleKeyword.toJSON()
        let theArticleIds = []
        for(let theArtKw of articleKeyword) {
            theArticleIds.push(theArtKw.article_id)
        }

        //----ARTICLES
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
        let searchTitle = ''
        if(request.all()['search_articles']){
            searchTitle = request.all()['search_articles']
        }
        let sort = 'created_at';
        if(request.all()['sort']){
            sort = request.all()['sort']
            console.log('Sort By', sort)
        }
        let articleIds = []
        let articles = await Artical.query().where(function () {
            if(searchTitle!='') {
                this
                .where('running_title', 'like', '%' + searchTitle + '%')
                .orWhere('full_title', 'like', '%' + searchTitle + '%')
            }
          }).whereIn('id', theArticleIds).with('journal').with('comments').orderBy(sort, 'desc').paginate(pageNumber, 10)
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
        sort = 'citiations';
        if(request.all()['sort']){
            sort = request.all()['sort']
            console.log('Sort By', sort)
        }
        articles = await Artical.query().where(function () {
            if(searchTitle!='') {
                this
                .where('running_title', 'like', '%' + searchTitle + '%')
                .orWhere('full_title', 'like', '%' + searchTitle + '%')
            }
          }).whereIn('id', theArticleIds).with('journal').with('journal').with('comments').orderBy(sort, 'desc').paginate(pageNumber, 10)
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
        //\---ARTICLES

        return view.render('journal.keyword', { 
            isLogged: isLogged, 
            user: user, 
            title: params.keyword, 
            keyword: params.keyword,
            articles : {
                recentPublished: recentPublished,
                highlyCited: highlyCited
            },
            search_title: searchTitle,
        })
    }

    async remove ({ view, response, session, request, params }) {
        let journal_id = 0
             
        session.put('msg', 'Journal Not Found')
        session.put('msg_type', 'danger')

        if(request.all()['journal_id']) {
            journal_id = parseInt(request.all()['journal_id'], 10)
            await Journal.query().where('id', journal_id).delete()
            session.put('msg', 'Journal Removed Successfully')
            session.put('msg_type', '')
        }


        return response.route('home')
    }
}

module.exports = JournalController