'use strict'

const Artical = use('App/Models/Artical')
const ArticleKeyword = use('App/Models/ArticleKeyword')
const Journal = use('App/Models/Journal')
const JournalKeyword = use('App/Models/JournalKeyword')
const User = use('App/Models/User')
const UserArticle = use('App/Models/UserArticle')
const UserArticleEditor = use('App/Models/UserArticleEditor')
const UserKeyword = use('App/Models/UserKeyword')
const Helpers = use('Helpers')
const Mail = use('Mail')
const phantom = require('phantom')
const Env = use('Env')
const fs = require('fs')
const moment = require('moment')
const docx = require('./docx')
// const HTMLParser = require('node-html-parser')
const striptags = require('striptags')
const Entities = require('html-entities').AllHtmlEntities
// const matchAll = require("match-all")

class ArticalController {
    async calcKeywords(article) {
        let articleKeyword, journalKeywords = await JournalKeyword.query().where('journal_id', article.journal_id).fetch()
        journalKeywords = journalKeywords.toJSON()
        for(let journalKeyword of journalKeywords) {
            if(article.running_title.toLowerCase().indexOf(journalKeyword.theword.toLowerCase())>=0){
                articleKeyword = new ArticleKeyword
                articleKeyword.article_id = article.id
                articleKeyword.journal_keywords_id = journalKeyword.id
                await articleKeyword.save()
            }else if(article.full_title.toLowerCase().indexOf(journalKeyword.theword.toLowerCase())>=0){
                articleKeyword = new ArticleKeyword
                articleKeyword.article_id = article.id
                articleKeyword.journal_keywords_id = journalKeyword.id
                await articleKeyword.save()
            }else if(article.summery.toLowerCase().indexOf(journalKeyword.theword.toLowerCase())>=0){
                articleKeyword = new ArticleKeyword
                articleKeyword.article_id = article.id
                articleKeyword.journal_keywords_id = journalKeyword.id
                await articleKeyword.save()
            }
        }
    }

    async keywordCheck({ view, response, session, request, params }) {
        let out = {
            error: "Journal Id not defined!",
            data: null,
        }
        if(params && params.journal_id) {
            let journalKeywords = await JournalKeyword.query().where('journal_id', params.journal_id).fetch()
            journalKeywords = journalKeywords.toJSON()
            out.error = null
            // out.data = journalKeywords
            let inp = String(request.all()['data']).toLowerCase()
            let result = {
                c1: 0,
                c2: 0,
                c3: 0,
            }
            for(let jK of journalKeywords) {
                if(inp.indexOf(jK.theword.toLowerCase())>=0) {
                    result[jK.category]++
                }
            }
            out.data = result
        }
        return out
    }

    async create ({ view, response, session, request, params }) {
        let isLogged = false, user = {}, msg = '', msg_type = ''
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
            msg = session.get('msg')
            msg_type = session.get('msg_type')
            session.forget('msg')
            session.forget('msg_type')
        }else {
            session.put('msg', 'You need to Login or Signup first')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        if(request.method()=='GET') {
            let journals = await Journal.all()
            let theJournalId  = session.get('submit_journal_id')
            if(!theJournalId) {
                theJournalId = -1
            }else {
                session.forget('submit_journal_id')
            }

            return view.render('artical.create', { 
                isLogged: isLogged,
                user: user,
                msg: msg,
                msg_type: msg_type,
                journals: journals.toJSON(),
                thejournal_id: theJournalId,
                disableJournal: (theJournalId>0),
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
                let ref = await docx.reference(Helpers.publicPath('static/articals') + '/' + filename)
                if(ref.length>0) {
                    artical.ref = ref.join("<br/>\n")
                    artical.refs = JSON.stringify(ref)
                }else {
                    artical.refs = '[]'
                }
            }

            artical.type = (request.all()['type_research'])?'research':'non-research'
            artical.full_title = request.all()['full_title']
            artical.running_title = request.all()['running_title']
            artical.summery = request.all()['summery']
            artical.author_id = user.id
            artical.journal_id = request.all()['journal_id']
            await artical.save()

            await this.calcKeywords(artical)

            session.put('msg', 'Article Save Successfully.')
            session.put('msg_type', '')
        }
        return response.route('home', {isLogged: isLogged})
    }

    async createForJournal ({ view, response, session, request, params }) {
        let isLogged = false, user = {}, msg = '', msg_type = ''
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
            msg = session.get('msg')
            msg_type = session.get('msg_type')
            session.forget('msg')
            session.forget('msg_type')
        }else {
            session.put('msg', 'You need to Login or Signup first')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        if(!params || !params.journal_id) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        session.put('submit_journal_id', params.journal_id)
        return response.route('artical_create', {isLogged: isLogged})
    }

    async profile ({ view, response, session, request, params }) {
        let isLogged = false, user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        // console.log('Params', params)
        if(!params || !params.article_id || isNaN(parseInt(params.article_id, 10))) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }

        let uploadedImage = '', selected_editor = -1

        let mainArticle = await Artical.query().with('journal').with('author').with('editors').where('id', parseInt(params.article_id, 10)).first()
        if(!mainArticle) {
            session.put('msg', 'Article Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/admin')
        }
        await mainArticle.getScholar()

        try{
            mainArticle.refs = JSON.parse(mainArticle.refs)
        }catch(e) {
            mainArticle.refs = []
        }

        console.log('the article refs', mainArticle.refs)

        let article = mainArticle.toJSON()
        if(article.publish_date) {
            article.publish_date = moment(article.publish_date).format('YYYY-MM-DD')
        }
        var open_refs = false
        if(request.method()=='POST') {
            if(request.all()['position']) {
                if(request.all()['position']=='corresponding') {
                    let author = await User.find(article.author_id)
                    if(!author) {
                        author = new User
                        author.group_id = 5
                    }
                    author.salutation = request.all()['salutation']
                    author.fname = request.all()['fname']
                    author.lname = request.all()['lname']
                    author.department = request.all()['department']
                    author.email = request.all()['email']
                    author.password = request.all()['password']
                    author.university_institute = request.all()['university_institute']
                    author.tell = request.all()['tell']
                    await author.save()
                    let userArticle = await UserArticle.query().where('users_id', author.id).where('article_id', article.id).first()
                    if(!userArticle) {
                        userArticle = new UserArticle
                        userArticle.users_id = author.id
                        userArticle.article_id = article.id
                        await userArticle.save()
                    }
                }else if(request.all()['position']=='first'){
                    let theAuthor = await User.query().where('email', request.all()['email']).first()
                    if(!theAuthor) {
                        theAuthor = new User
                        theAuthor.group_id = 5
                    }
                    theAuthor.salutation = request.all()['salutation']
                    theAuthor.fname = request.all()['fname']
                    theAuthor.lname = request.all()['lname']
                    theAuthor.department = request.all()['department']
                    theAuthor.email = request.all()['email']
                    theAuthor.password = request.all()['password']
                    theAuthor.university_institute = request.all()['university_institute']
                    theAuthor.tell = request.all()['tell']
                    await theAuthor.save()
                    let userArticle = await UserArticle.query().where('users_id', theAuthor.id).where('article_id', article.id).first()
                    if(!userArticle) {
                        userArticle = new UserArticle
                        userArticle.users_id = theAuthor.id
                        userArticle.article_id = article.id
                    }
                    userArticle.position = request.all()['position']
                    await userArticle.save()
                }else if(request.all()['position']=='co'){
                    let theAuthor = await User.query().where('fname', request.all()['fname']).where('lname', request.all()['lname']).first()
                    if(!theAuthor) {
                        theAuthor = new User
                        theAuthor.group_id = 5
                    }
                    theAuthor.fname = request.all()['fname']
                    theAuthor.lname = request.all()['lname']
                    theAuthor.university_institute = request.all()['university_institute']
                    await theAuthor.save()
                    let userArticle = await UserArticle.query().where('users_id', theAuthor.id).where('article_id', article.id).first()
                    if(!userArticle) {
                        userArticle = new UserArticle
                        userArticle.users_id = theAuthor.id
                        userArticle.article_id = article.id
                    }
                    userArticle.position = request.all()['position']
                    await userArticle.save()
                }
            }else if(request.all()['abstract']) {
                mainArticle.abstract = request.all()['abstract']
                await mainArticle.save()
                article.abstract = request.all()['abstract']
            }else if(request.all()['introduction']) {
                mainArticle.introduction = request.all()['introduction']
                await mainArticle.save()
                article.introduction = request.all()['introduction']
            }else if(request.all()['material']) {
                mainArticle.material = request.all()['material']
                await mainArticle.save()
                article.material = request.all()['material']
            }else if(request.all()['results']) {
                mainArticle.results = request.all()['results']
                await mainArticle.save()
                article.results = request.all()['results']
            }else if(request.all()['disc']) {
                mainArticle.disc = request.all()['disc']
                await mainArticle.save()
                article.disc = request.all()['disc']
            }else if(request.all()['ack']) {
                mainArticle.ack = request.all()['ack']
                await mainArticle.save()
                article.ack = request.all()['ack']
            }else if(request.all()['ref']) {
                mainArticle.ref = request.all()['ref']
                await mainArticle.save()
                article.ref = request.all()['ref']
            }else if(request.all()['check_editor_email']) {
                let testUser = await User.query().where('email', request.all()['check_editor_email']).first()
                if(!testUser) {
                    return {
                        status: false
                    }
                }
                return {
                    status: true,
                    data: testUser.toJSON()
                }
            }else if(request.all()['editor_email']) {
                let assignEditor = await User.query().where('email', request.all()['editor_email']).first()
                if(!assignEditor) {
                    assignEditor = new User
                    assignEditor.fname = request.all()['editor_fname']
                    assignEditor.lname = request.all()['editor_lname']
                    assignEditor.email = request.all()['editor_email']
                    assignEditor.password = '123456'
                    await assignEditor.save()
                }
                let userArticleEditor = await UserArticleEditor.query().where('users_id', assignEditor.id).where('article_id', article.id).first()
                if(!userArticleEditor) {
                    userArticleEditor = new UserArticleEditor
                    userArticleEditor.sender_id = user.id
                    userArticleEditor.users_id = assignEditor.id
                    userArticleEditor.article_id = article.id
                    userArticleEditor.status = 'pending'
                    await userArticleEditor.save()
                    article.editors.push(assignEditor.toJSON())
                    article.status = 'editor_assigned'
                    mainArticle.status = 'editor_assigned'
                    await mainArticle.save()
                    try{
                        // await Mail.send('emails.welcome', {}, (message) => {
                        //     message.from('info@imaqpress.com')
                        //     message.to(request.all()['editor_email'])
                        //     message.subject('Subjected Mail')
                        // })
                        let mailResult = await docx.sendMail(assignEditor.email, 'Assigning to article as editor', 
                            `<h1>iMaqPress</h1>
                            <p>
                            Dear ${ assignEditor.fname } ${ assignEditor.lname }<br/>
                            You are assigned as editor for ${ article.running_title }. Please sign in the <a href="${ Env.get('APP_URL') }">iMaqPress</a> 
                            with this email and in case you did not register on our site, you shall login with password of <b>123456</b>.<br/>
                            </p>`)
                    }catch(e) {
                        console.log('Send Mail Error')
                        console.log(e)
                    }
                }
            }else if(request.all()['radios3']) {
                mainArticle.status = request.all()['radios3']
                if(mainArticle.status=='published') {
                    mainArticle.publish_date = moment().format('YYYY-MM-DD HH:mm:ss')
                }
                await mainArticle.save()
                article.status = mainArticle.status
                article.publish_date = mainArticle.publish_date
                
            }else if(request.file('image_upload')) {
                console.log('uploading image')
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
                    console.log('Upload done', uploadedImage)
                }
            }else if(request.all()['doi']) {
                mainArticle.doi = request.all()['doi']
                mainArticle.publish_vol = request.all()['publish_vol']
                mainArticle.publish_no = request.all()['publish_no']
                mainArticle.publish_startpage = request.all()['publish_startpage']
                mainArticle.publish_endpage = request.all()['publish_endpage']
                await mainArticle.save()
                article.doi = request.all()['doi']
                article.publish_vol = request.all()['publish_vol']
                article.publish_no = request.all()['publish_no']
                article.publish_startpage = request.all()['publish_startpage']
                article.publish_endpage = request.all()['publish_endpage']
            }else if(request.all()['editor-role']){
                let editorType = request.all()['editor-role'], editorId = 0, assignEditor
                if(request.all()['selected_id:']) {
                    editorId = parseInt(request.all()['selected_id:'], 10)
                    assignEditor = await User.query().where('id', editorId).first()
                    if(!assignEditor) {
                        editorId = 0
                    }
                }else if(request.all()['reviewer-email'] && request.all()['reviewer-email']!='') {
                    assignEditor = await User.query().where('email', request.all()['reviewer-email']).first()
                    if(assignEditor) {
                        editorId = assignEditor.id
                    }
                }else if(request.all()['new-editor-email'] && request.all()['new-editor-email']!='' && request.all()['new-editor-name']!='') {
                    assignEditor = new User
                    assignEditor.email = request.all()['new-editor-email']
                    assignEditor.lname = (request.all()['new-editor-name'].split(',').length!=2)?request.all()['new-editor-name']:request.all()['new-editor-name'].split(',')[1]
                    assignEditor.fname = (request.all()['new-editor-name'].split(',').length!=2)?'':request.all()['new-editor-name'].split(',')[0]
                    assignEditor.salutation = request.all()['new-editor-salut']
                    assignEditor.password = '123456'
                    await assignEditor.save()
                    editorId = assignEditor.id
                }
                if(editorId>0) {
                    let userArticleEditor = await UserArticleEditor.query().where('users_id', editorId).where('article_id', article.id).first()
                    if(!userArticleEditor) {
                        userArticleEditor = new UserArticleEditor
                        userArticleEditor.sender_id = user.id
                        userArticleEditor.users_id = editorId
                        userArticleEditor.article_id = article.id
                        userArticleEditor.status = 'pending'
                        userArticleEditor.type = editorType
                        await userArticleEditor.save()
                        article.editors.push(assignEditor.toJSON())
                        article.status = 'editor_assigned'
                        mainArticle.status = 'editor_assigned'
                        await mainArticle.save()
                        try{
                            // let mailResult = await Mail.send('emails.welcome', {}, (message) => {
                            //     message.from('info@imaqpress.com')
                            //     message.to(assignEditor.email)
                            //     message.subject('Subjected Mail')
                            // })
                            let mailResult = await docx.sendMail(assignEditor.email, 'Assigning to article as ' + editorType, '', 
                                `<h1>iMaqPress</h1>
                                <p>
                                Dear ${ assignEditor.fname } ${ assignEditor.lname }<br/>
                                You are assigned as ${ editorType } for ${ article.running_title }. Please sign in the <a href="${ Env.get('APP_URL') }">iMaqPress</a> 
                                with this email and in case you did not register on our site, you shall login with password of <b>123456</b>.<br/>
                                </p>`)
                            console.log('Mail Result', mailResult)
                        }catch(e) {
                            console.log('Send Mail Error')
                            console.log(e)
                        }
                    }
                }
                // console.log('Request', request.all())
            }else if(request.all()['therefs']){
                console.log('new refs', request.all()['therefs'])
                try{
                    let theRefs = []
                    theRefs = JSON.parse(request.all()['therefs'])
                    console.log('which is ', theRefs)
                    mainArticle.refs = request.all()['therefs']
                    await mainArticle.save()
                    mainArticle.refs = theRefs
                    article = mainArticle.toJSON()
                    open_refs = true
                }catch(e) {}
            }else {
                if(request.all()['shared_on_social']) {
                    mainArticle.shared_on_social = 1
                    article.shared_on_social = 1
                }
                if(request.all()['scientific_database']) {
                    mainArticle.scientific_database = 1
                    article.scientific_database = 1
                }
                if(request.all()['news_seo']) {
                    mainArticle.news_seo = 1
                    article.news_seo = 1
                }
                await mainArticle.save()
            }
        }

        let whereClause = "'" + mainArticle.running_title + "' like concat('%', keyword, '%')"
        let preEditors = await UserKeyword.query().whereRaw(whereClause).with('user').fetch()
        // console.log('Pre Editors', whereClause, preEditors.toJSON())
        preEditors = preEditors.toJSON()
        let PreEditors = {}, allCount = 0, sortable = []
        for(let tmpE of preEditors) {
            if(!PreEditors[tmpE.users_id]) {
                allCount = await UserKeyword.query().where('users_id', tmpE.users_id).count('* as total')
                allCount = allCount[0].total
                PreEditors[tmpE.users_id] = {
                    id: tmpE.users_id,
                    fname: tmpE.user.fname,
                    lname: tmpE.user.lname,
                    count: 0,
                    allCount: allCount,
                    percent: 0,
                }
            }
            PreEditors[tmpE.users_id].count++
            if(PreEditors[tmpE.users_id].allCount>0) {
                PreEditors[tmpE.users_id].percent = parseInt(100*PreEditors[tmpE.users_id].count/PreEditors[tmpE.users_id].allCount, 10)
            }
        }
        
        for(let id in PreEditors) {
            sortable.push([id, PreEditors[id].percent]);
        }

        sortable.sort(function(a, b) {
            return a[1] - b[1];
        });

        // console.log('PreEditors', PreEditors)
        // console.log('Sorted', sortable)

        let tmpEd = PreEditors
        PreEditors = []
        if(sortable.length>0) {
            for(let i = sortable.length-1;i >= Math.max(0, sortable.length-5);i--) {
                PreEditors.push(tmpEd[sortable[i][0]])
            }    
        }

        let userEmails = await User.query().whereNotNull('email').pluck('email')


        // console.log('Sorted PreEditors', PreEditors)


        article['reviewers'] = []
        let userEdits = await UserArticleEditor.query().with('comments').where('article_id', article.id).fetch()
        // article['comments'] = userEdits.toJSON()
        userEdits = userEdits.toJSON()
        // console.log('Editors and Reviewers', userEdits)
        let finalEditors = []
        for(let uEdit of userEdits) {
            for(let i = 0;i < article.editors.length;i++) {
                let editor = article.editors[i]
                if(editor.id == uEdit.users_id) {
                    article.editors[i]['comments'] = uEdit.comments
                    if(uEdit.type=='reviewer') {
                        article.reviewers.push(article.editors[i])    
                    }else if(uEdit.type=='editor') {
                        finalEditors.push(article.editors[i])
                    }
                }
            }
        }
        article.editors = finalEditors
        let userArticles = await UserArticle.query().with('user').where('article_id', article.id).fetch()
        userArticles = userArticles.toJSON()
        for(let userArt of userArticles) {
            if(!article[userArt.position]) {
                article[userArt.position] = []
            }
            article[userArt.position].push(userArt.user)
        }

        // console.log('Article', article)

        let status_color = 'primary'
        if(article.status == 'published') {
            status_color = 'success'
        }else if(article.status == 'rejected') {
            status_color = 'danger'
        }


        let msg = session.get('msg')
        let msg_type = session.get('msg_type')
        session.forget('msg')
        session.forget('msg_type')
        return view.render('artical.profile', {
            isLogged: isLogged, 
            user:user, 
            article: article, 
            status_color: status_color, 
            msg: msg, 
            msg_type: msg_type,
            uploadedImage: uploadedImage,
            selected_editor: selected_editor,
            preeditors: PreEditors,
            userEmails: JSON.stringify(userEmails),
            open_refs: open_refs,
        })
    }

    async publish ({ view, response, session, request, params }) {
        let isLogged = false, user = {}
        if(session.get('user')) {
            isLogged = true
            user = session.get('user')
        }

        if(!params || !params.article_name || params.article_name=='') {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }

        params.article_name = params.article_name.replace(/-/g, ' ')

        let theArticle = await Artical.query().with('journal').with('author').with('keyword.keyword').where('running_title', params.article_name).where('status', 'published').first()
        // console.log('theArticle', theArticle.toJSON())
        if(!theArticle) {
            // console.log('Not Found!', theArticle)
            session.put('msg', 'Article Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }
        
        if(request.all()['pdf']) {
            theArticle.downloads++
            await theArticle.save()
            const ph = await phantom.create()
            const page = await ph.createPage()
            await page.property('viewportSize', { width: 2000, height: 768 });
            const status = await page.open(Env.get('APP_URL') + "/article/" + params.article_name.replace(/ /g, '-'))
            // const content = await page.property('content')
            await page.render(Helpers.tmpPath(params.article_name.replace(/ /g, '-') + '.pdf'))
            const content = fs.readFileSync(Helpers.tmpPath(params.article_name.replace(/ /g, '-') + '.pdf'))
            // console.log(content)
            fs.unlinkSync(Helpers.tmpPath(params.article_name.replace(/ /g, '-') + '.pdf'))
            ph.exit()
            response.header('Content-type', 'application/pdf')
            return response.send(content)

        }

        theArticle.views++
        await theArticle.save()


        let articles = await Artical.query().with('journal').where('journal_id', theArticle.journal_id).where('status', 'published').where('id', '!=', theArticle.id).orderBy('citiations', 'desc').limit(3).fetch()
        articles = articles.toJSON()
        for(let i = 0;i < articles.length;i++) {
            if(articles[i].abstract && articles[i].abstract.split(" ").length>30) {
                articles[i].abstract = articles[i].abstract.split(" ").splice(0,30).join(" ") + '...'
            }
        }

        // console.log('!!!!!')
        let article = theArticle.toJSON() , otherAuthors = [], corAuthors = []
        if(article.author) {
            otherAuthors = await UserArticle.query().with('user').where('article_id', theArticle.id).whereNot('users_id', article.author.id).whereNot('position', 'corresponding').fetch()
            otherAuthors = otherAuthors.toJSON()
    
            corAuthors = await UserArticle.query().with('user.country').where('article_id', theArticle.id).whereNot('users_id', article.author.id).where('position', 'corresponding').fetch()
            corAuthors = corAuthors.toJSON()
    
        }
        // console.log('CorAuthors', corAuthors)
        
        let star = '*', stars = ''
        for(let i = 1;i <= corAuthors.length;i++) {
            stars = ''
            for(let j = 0;j < i;j++) {
                stars += star
            }
            corAuthors[i-1].stars = stars
        }

        // console.log('Article')
        // console.log(article)
        
        let msg = session.get('msg')
        let msg_type = session.get('msg_type')
        session.forget('msg')
        session.forget('msg_type')
        return view.render('artical.publish', {
            isLogged: isLogged, 
            user:user, 
            article: article,
            otherAuthors: otherAuthors,
            corAuthors: corAuthors,
            msg: msg, 
            msg_type: msg_type,
            articles: articles,
        })
    }

    async email ({ view, response, session, request, params }) {
        try{
            let mailResult = await docx.sendMail('m.mirsamie@gmail.com', 'Test Email', 'Text Mail', '<h1>Html Mail</h1>')
            console.log('Mail Result', mailResult)
        }catch(e) {
            console.log('Send Mail Error')
            // console.log(e)
        }
        return 'ok';
    }

    static html2xml (inp) {
        String.prototype.replaceAt=function(index, replacement) {
            return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
        }
        const entities = new Entities()
        let out = striptags(inp, ['p', 'table', 'tr', 'td', 'a', 'strong'], '')
        out = entities.decode(out)
        // links
        let re = /<\s*a[^>]*>/g
        
        let m, tmp, href, retmp

        do {
            m = re.exec(out)
            if (m) {
                // console.log(m)
                tmp = out.substring(m.index+1).toLowerCase().split('href="')
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    if(tmp.indexOf('#')==0) {
                        href= tmp
                        // console.log('replace ', m[0])
                        retmp = new RegExp(m[0], 'g')
                        out = out.replace(retmp, `</w:t></w:r><w:hyperlink w:anchor="${ href }"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>`)
                    }
                }
            }
        } while (m)
        out = out.replace(/<\/a>/g, `</w:t></w:r></w:hyperlink><w:r><w:t>`)

        //\links
        out = out.replace(/<\s*p[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/p>/g, `</w:t></w:r></w:p>`)
        
        out = out.replace(/<strong>/g, `</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>`)
        out = out.replace(/<\/strong>/g, `</w:t></w:r><w:r><w:t>`)
        
        out = out.replace(/<\s*table[^>]*>/g, `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:start w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:end w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:insideH w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:insideV w:val="single" w:sz="12" w:space="0" w:color="000000" /></w:tblBorders></w:tblPr>`)
        out = out.replace(/<\/table>/g, `</w:tbl>`)
        out = out.replace(/<\s*td[^>]*>/g, `<w:tc>`)
        out = out.replace(/<\/td>/g, `</w:tc>`)
        out = out.replace(/<\s*tr[^>]*>/g, `<w:tr>`)
        out = out.replace(/<\/tr>/g, `</w:tr>`)
        out = out.replace(/&nbsp;/g, ' ')
        return out
    }

    async pdf ({ view, response, session, request, params }) {
        try{
            let theHtml = fs.readFileSync('/Users/machouse/Desktop/intro.html')
            theHtml = theHtml.toString()
            // theHtml = `<p><strong>abbas</strong> <a href="#_ENREF_10">Hengasdsdsd</a></p>`
            let theXML = ArticalController.html2xml(theHtml)
            // console.log('XML', theXML)
            fs.writeFileSync('thexml.xml', theXML)

            let docxfile = await docx.fillTemplateWord({
                //---global
                global_doi: '10.15562',
                //---journal
                journal_name: 'Journal of Genes and Cells',
                journal_vol: '3',
                jounral_n: '2017-Cell Therapy & Reg. Med.-I',
                journal_doi: 'gnc',
                image: '/Volumes/projects/erfan/erfan/public/static/img/journal/j_0.png',
                //---article
                header_author: 'Akhavanezayat et al.',
                article_publish_month_year: 'January, 2017',
                article_pages: '39-46',
                article_doi: '55',
                article_type: 'Research',
                article_full_title: `Toxicity of Five Local Anesthesia Drugs on Cells and Multipotent Stem Cells`,
                article_submision_date: '24 November 2016',
                article_acceptance_date: '25 April 2017',
                article_abstract: ``,//`<b>Objectives:</b> Mesenchymal stem cells (MSCs) play an important role in treating damaged tissues, growing and developing body tissues. Nowadays, the injection of stem cells has been considered for therapeutic purposes. Some substances which can be effective in the success rate of treatment are injected with the stem cells in the stem cell therapy. Anesthetics are a group of them. Local anesthetics toxicity on tissues such as nerve, cartilage, muscle and tendon are well described in many studies. Studies show local anesthesia can be toxic for stem cells too, and induce MSCs apoptosis and necrosis As a result, repairing of tissue by stem cells can be in trouble in damaged tissue which exposure to LAs. According to this, it is important to find the appropriate LA which has the least toxic effect on stem cells. In this study, we have considered the effects of LA such as lidocaine, bupivacaine, ropivacaine and mepivacaine on MSCs. Literature review: Local anesthetics toxicity has been described on chondrocytes by several studies. In this study, we have tried to find the effects of these drugs on mesenchymal stem cells. We have arranged local anesthetics for toxic effects to MSCs from high to low. According to this arrangement bupivacaine is the first drug, after that there are mepivacaine, lidocaine and ropivacaine, respectively. This sequence can be true for increasing the cellular metabolism, adhesive cells adhesion and also cellular appendages. Conclusion: The studies have indicated that MSCs is more sensitive to local anesthetics in comparison with chondrocytes. In addition to type of LAs, exposure time and drug dose play an important role in damaging to the MSCs. In other word, LAs effects are dose-dependent and time-dependent. however, The studies consider lesser neurotoxicity and longer local anesthesia effect for bupivacaine in comparison with other LAs such as lidocaine but it is recommended to use drugs which are safer (such as ropivacaine) in procedures including stem cell therapy, prolonged anesthesia and tissues are repairing. Because bupivacaine has high toxicity effect on mesenchymal stem cells. `,
                keywords: theXML,
                // sample_image: `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                // <pic:nvPicPr>
                // <pic:cNvPr id="0" name="Blue hills.jpg"/>
                // <pic:cNvPicPr/>
                // </pic:nvPicPr>
                // <pic:blipFill>
                // <a:blip r:embed="rId4" cstate="print"/>
                // <a:stretch>
                // <a:fillRect/>
                // </a:stretch/>
                // </pic:blipFill>
                // <pic:spPr>
                // <a:xfrm>
                // <a:off x="0" y="0"/>
                // <a:ext cx="2438400" cy="1828800"/>
                // </a:xfrm>
                // <a:prstGeom rst="rect>
                // <a:avLst/>
                // </a:prstGeom>
                // </pic:spPr>
                // </pic:pic>`,
                //---author
                authors: [
                    {
                        name: 'Arash Akhavan Rezayat',
                        index: '1',
                    },
                    {
                        name: ', Hamid Reza Rahimi',
                        index: '2',
                    },
                    {
                        name: ', Atefe Joveini',
                        index: '1',
                    },
                    {
                        name: ', Shahrzad Maraghe Moghadam',
                        index: '1',
                    },
                    {
                        name: ', Ghasem Soltani',
                        index: '3',
                    },
                    {
                        name: ', Mohammad Reza Khojasteh',
                        index: '5',
                    },
                    {
                        name: ', Nahid Zirak',
                        index: '5*',
                    },
                ],
                author_affs: [
                    {
                        index: '1',
                        name: 'Research Committee, Stem cell research group, Faculty of medicine, Mashhad University of Medical Sciences, Mashhad, Iran.\n',
                    },
                    {
                        index: '2',
                        name: 'Department of Modern Sciences & Technologies, Faculty of Medicine, Mashhad University of Medical Sciences, Mashhad, Iran.\n',
                    },
                    {
                        index: '3',
                        name: 'Department of Cardiac Surgery, Imam Reza Hospital, Mashhad University of Medical Sciences, Iran.\n',
                    },
                    {
                        index: '4',
                        name: 'Research Committee, Stem cell research group, Medical Student at Islamic Azad University, Mashhad Branch, Mashhad, Iran.\n',
                    },
                    {
                        index: '5',
                        name: 'Department of Anesthesia, Cardiac Anesthesia Research Center, Imam-Reza Hospital, Mashhad Iran.\n',
                    },
                ],
            }, 'hh')
            console.log('Docx file Result', docxfile)
            // await docx.docxToPdf(docxfile, 'hh')
        }catch(e) {
            console.log('Pdf Error')
            console.log(e)
        }
        return 'ok';
    }
}

module.exports = ArticalController