'use strict'

const Artical = use('App/Models/Artical')
const ArticleKeyword = use('App/Models/ArticleKeyword')
const Journal = use('App/Models/Journal')
const JournalKeyword = use('App/Models/JournalKeyword')
const User = use('App/Models/User')
const UserArticle = use('App/Models/UserArticle')
const UserArticleEditor = use('App/Models/UserArticleEditor')
const UserKeyword = use('App/Models/UserKeyword')
const ArticleDefinedKeyword = use('App/Models/ArticleDefinedKeyword')
const Helpers = use('Helpers')
const path = require('path')
const phantom = require('phantom')
const Env = use('Env')
const fs = require('fs')
const moment = require('moment')
const docx = require('./docx')
// const HTMLParser = require('node-html-parser')
const striptags = require('striptags')
const Entities = require('html-entities').AllHtmlEntities
// const decode = require('unescape')
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

    static async getKeywordsOf(journal_id, inp) {
        let out = []
        let articleKeyword, journalKeywords = await JournalKeyword.query().where('journal_id', journal_id).fetch()
        journalKeywords = journalKeywords.toJSON()
        for(let journalKeyword of journalKeywords) {
            if(inp.toLowerCase().indexOf(journalKeyword.theword.toLowerCase())>=0){
                out.push(journalKeyword.theword)
            }
        }
        return out
    }

    async keywordCheck({ view, response, session, request, params }) {
        let out = {
            error: "Journal Id not defined!",
            data: null,
        }
        if(params && params.journal_id) {
            // let journalKeywords = await JournalKeyword.query().where('journal_id', params.journal_id).fetch()
            // journalKeywords = journalKeywords.toJSON()
            // out.error = null
            // // out.data = journalKeywords
            // let inp = String(request.all()['data']).toLowerCase()
            // let result = {
            //     c1: 0,
            //     c2: 0,
            //     c3: 0,
            // }
            // for(let jK of journalKeywords) {
            //     if(inp.indexOf(jK.theword.toLowerCase())>=0) {
            //         result[jK.category]++
            //     }
            // }
            let result = await JournalKeyword.keywordCheck(params.journal_id, request.all()['data'])
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
        }else {
            session.put('msg', 'You need to Login or Signup first')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
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

        let keyword = {
            full_title: 25,
            running_title: 25,
            summery: 25,
        }

        let keywordResult = await JournalKeyword.keywordCheck(mainArticle.journal_id, mainArticle.full_title)
        if(keywordResult.c1>0) {
            keyword.full_title = 100
        }else if(keywordResult.c2>0) {
            keyword.full_title = 75
        }

        keywordResult = await JournalKeyword.keywordCheck(mainArticle.journal_id, mainArticle.running_title)
        if(keywordResult.c1>0) {
            keyword.running_title = 100
        }else if(keywordResult.c2>0) {
            keyword.running_title = 75
        }

        keywordResult = await JournalKeyword.keywordCheck(mainArticle.journal_id, mainArticle.summery)
        if(keywordResult.c1>0) {
            keyword.summery = 100
        }else if(keywordResult.c2>0) {
            keyword.summery = 75
        }

        if(mainArticle.author_id<=0) {
            let theFirstAuthor = await UserArticle.query().where('article_id', mainArticle.id).where('position', 'first').first()
            if(theFirstAuthor) {
                mainArticle.author_id = theFirstAuthor.users_id
                await mainArticle.save()
            }
        }
        await mainArticle.getScholar()
        if(user.group_id!=1 && user.journal_id!=mainArticle.journal_id) {
            session.put('msg', 'You do not have permission to this article')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        let dkeywords = await ArticleDefinedKeyword.query().where('article_id', mainArticle.id).pluck('theword')

        // console.log('the article refs', mainArticle.refs)

        let article = mainArticle.toJSON()
        // console.log('The Author', article.author)

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
                    if(mainArticle.author_id<=0) {
                        mainArticle.author_id = theAuthor.id
                        await mainArticle.save()
                        article = mainArticle.toJSON()
                    }
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
                    // mainArticle.refs = theRefs
                    // article = mainArticle.toJSON()
                    open_refs = true
                }catch(e) {}
            }else  if(request.all()['thekeywords']){
                console.log('new keywords', request.all()['thekeywords'])
                try{
                    let theKeywords = []
                    theKeywords = JSON.parse(request.all()['thekeywords'])
                    console.log('which is ', theKeywords)
                    let inserts = []
                    for(let theKeyword of theKeywords) {
                        inserts.push({
                            article_id: mainArticle.id,
                            theword: theKeyword,
                            creator_id: user.id,
                        })
                    }
                    await ArticleDefinedKeyword.query().where('article_id', mainArticle.id).delete()
                    console.log('inserting keywords', inserts)
                    await ArticleDefinedKeyword.createMany(inserts)
                    dkeywords = theKeywords
                }catch(e) {
                    console.log('Key word insert error')
                    console.log(e)
                }
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
            ArticalController.genPdf(mainArticle.id)
        }


        try{
            mainArticle.refs = JSON.parse(mainArticle.refs)
        }catch(e) {
            mainArticle.refs = []
        }

        article.refs = mainArticle.refs

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
        // console.log('dkeywords', dkeywords)
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
            keyword: keyword,
            dkeywords: dkeywords,
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
        if(!theArticle) {
            // console.log('Not Found!', theArticle)
            session.put('msg', 'Article Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }
        
        let baseDirAr = __dirname.split('/'), baseDir = ''
        for(var i = baseDirAr.length - 4;i>=0;i--) {
          baseDir = '/' + baseDirAr[i] + baseDir
        }
        baseDir = baseDir.substring(1)
        let hasPDF = fs.existsSync(baseDir + '/public/pdf/gen_' + theArticle.id + '.pdf')
        let hasEPUB = fs.existsSync(baseDir + '/public/pdf/gen_' + theArticle.id + '.epub')
        let hasXML = fs.existsSync(baseDir + '/public/pdf/gen_' + theArticle.id + '.xml')
        let hasENDNOTE = fs.existsSync(baseDir + '/public/pdf/gen_' + theArticle.id + '.enw')

        theArticle.views++
        await theArticle.save()


        let dkeywords = await ArticleDefinedKeyword.query().where('article_id', theArticle.id).pluck('theword')


        let articles = await Artical.query().with('journal').where('journal_id', theArticle.journal_id).where('status', 'published').where('id', '!=', theArticle.id).orderBy('citiations', 'desc').limit(3).fetch()
        articles = articles.toJSON()
        for(let i = 0;i < articles.length;i++) {
            if(articles[i].abstract && articles[i].abstract.split(" ").length>30) {
                articles[i].abstract = articles[i].abstract.split(" ").splice(0,30).join(" ") + '...'
            }
        }

        let article = theArticle.toJSON() , otherAuthors = [], corAuthors = []
        try{
            article.refs = JSON.parse(article.refs)
        }catch(e) {
            article.refs = []
        }
        if(article.author) {
            otherAuthors = await UserArticle.query().with('user').where('article_id', theArticle.id)/*.whereNot('users_id', article.author.id)*/.whereNot('position', 'corresponding').fetch()
            otherAuthors = otherAuthors.toJSON()

            corAuthors = await UserArticle.query().with('user').with('user.country').where('article_id', theArticle.id)/*.whereNot('users_id', article.author.id)*/.where('position', 'corresponding').fetch()
            corAuthors = corAuthors.toJSON()
        }
        
        let star = '*', stars = ''
        for(let i = 1;i <= corAuthors.length;i++) {
            stars = ''
            for(let j = 0;j < i;j++) {
                stars += star
            }
            corAuthors[i-1].stars = stars
        }
        
        let msg = session.get('msg')
        let msg_type = session.get('msg_type')
        session.forget('msg')
        session.forget('msg_type')
        console.log('CorAuthors', corAuthors)
        return view.render('artical.publish', {
            isLogged: isLogged, 
            user:user, 
            article: article,
            otherAuthors: otherAuthors,
            corAuthors: corAuthors,
            msg: msg, 
            msg_type: msg_type,
            articles: articles,
            hasPDF: hasPDF,
            hasEPUB: hasEPUB,
            hasXML: hasXML,
            hasENDNOTE: hasENDNOTE,
            global_doi: Env.get('DOI'),
            dkeywords: dkeywords,
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
        if(inp==null || inp=='') {
            return { 
                xml:'<w:p><w:r><w:t></w:t></w:r></w:p>', 
                images: [],
            }
        }
        let baseDirAr = __dirname.split('/'), baseDir = ''
        for(var i = baseDirAr.length - 4;i>=0;i--) {
          baseDir = '/' + baseDirAr[i] + baseDir
        }
        baseDir = baseDir.substring(1)
        const entities = new Entities()
        let out = striptags(inp, ['p', 'table', 'tr', 'td', 'a', 'strong', 'img'], '')
        // out = decode(out)
        out = out.replace(/\&lt;/g, '#ABBAS#')
        out = out.replace(/\&gt;/g, '#GHOLI#')
        out = entities.decode(out)
        // out = out.replace('<', '&lt;')
        // console.log('HTML :')
        // console.log(out)
        // console.log('-----------------')
        out = out.replace(/<\s*p[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/p>/g, `</w:t></w:r></w:p>`)

        out = out.replace(/<\s*h1[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/h1>/g, `</w:t></w:r></w:p>`)
        out = out.replace(/<\s*h2[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/h2>/g, `</w:t></w:r></w:p>`)
        out = out.replace(/<\s*h3[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/h3>/g, `</w:t></w:r></w:p>`)
        out = out.replace(/<\s*h4[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/h4>/g, `</w:t></w:r></w:p>`)
        out = out.replace(/<\s*h5[^>]*>/g,`<w:p><w:r><w:t>`)
        out = out.replace(/<\/h5>/g, `</w:t></w:r></w:p>`)
        
        out = out.replace(/<strong>/g, `</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>`)
        out = out.replace(/<\/strong>/g, `</w:t></w:r><w:r><w:t>`)
        
        out = out.replace(/<\s*table[^>]*>/g, `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:start w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:end w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:insideH w:val="single" w:sz="12" w:space="0" w:color="000000" /><w:insideV w:val="single" w:sz="12" w:space="0" w:color="000000" /></w:tblBorders></w:tblPr>`)
        out = out.replace(/<\/table>/g, `</w:tbl>`)
        out = out.replace(/<\s*td[^>]*>/g, `<w:tc>`)
        out = out.replace(/<\/td>/g, `</w:tc>`)
        out = out.replace(/<\s*tr[^>]*>/g, `<w:tr>`)
        out = out.replace(/<\/tr>/g, `</w:tr>`)
        out = out.replace(/&nbsp;/g, ' ')

        let m, tmp, href, retmp, re
        // links
        re = /<\s*a[^>]*>/g

        do {
            m = re.exec(out)
            if (m) {
                tmp = out.substring(m.index+1).toLowerCase().split('href="')
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    if(tmp.indexOf('#')==0) {
                        href= tmp
                        retmp = new RegExp(m[0], 'g')
                        out = out.replace(retmp, `</w:t></w:r><w:hyperlink w:anchor="${ href }"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>`)
                    }
                }
            }
        } while (m)
        out = out.replace(/<\/a>/g, `</w:t></w:r></w:hyperlink><w:r><w:t>`)
        //\links
        // images
        re = /<\s*img[^>]*>/g
        let images = []
    

        // 666750
        let index = 0, imageTmp = '', imageTemp = `<w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="3333750" cy="3333750" />
            <wp:effectExtent l="0" t="0" r="0" b="0" />
            <wp:docPr id="2" name="Image 2" descr="image" />
            <wp:cNvGraphicFramePr>
                <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1" />
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                    <pic:nvPicPr>
                    <pic:cNvPr id="0" name="Picture 1" descr="image" />
                    <pic:cNvPicPr>
                        <a:picLocks noChangeAspect="1" noChangeArrowheads="1" />
                    </pic:cNvPicPr>
                    </pic:nvPicPr>
                    <pic:blipFill>
                    <a:blip r:embed="rId#index#">
                        <a:extLst>
                        <a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}">
                            <a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0" />
                        </a:ext>
                        </a:extLst>
                    </a:blip>
                    <a:srcRect />
                    <a:stretch>
                        <a:fillRect />
                    </a:stretch>
                    </pic:blipFill>
                    <pic:spPr bwMode="auto">
                    <a:xfrm>
                        <a:off x="0" y="0" />
                        <a:ext cx="3333750" cy="3333750" />
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                        <a:avLst />
                    </a:prstGeom>
                    <a:noFill />
                    <a:ln>
                        <a:noFill />
                    </a:ln>
                    </pic:spPr>
                </pic:pic>
                </a:graphicData>
            </a:graphic>
            </wp:inline>
        </w:drawing>`
        // console.log('Images : ')
        do {
            m = re.exec(out)
            // console.log(m)
            if (m) {
                tmp = out.substring(m.index+1).toLowerCase().split('src="')
                // console.log('try src', tmp)
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    href= tmp
                    retmp = new RegExp(m[0], 'g')
                    imageTmp = imageTemp.replace(/#index#/g, index)
                    out = out.replace(retmp, `${ imageTmp}`)
                    index++
                    images.push(href)
                }
            }
        } while (m)
        //\images

        out = out.replace(/#ABBAS#/g, '&lt;')
        out = out.replace(/#GHOLI#/g, '&gt;')
        // console.log('XML')
        // console.log(out)
        // console.log('___________________________')
        return {
            xml: out,
            images: images,
        }
    }

    static ref2xml (refs) {
        let out = '<w:p>', refName = ''
        for(let i = 0;i < refs.length;i++) {
            refName = '#_ENREF_' + (i+1)
            out += `<w:bookmarkStart w:id="0" w:name="${ refName }"/><w:r><w:t>${i+1} - ${ refs[i] }</w:t></w:r><w:bookmarkEnd w:id="0"/><w:br/><w:br/>`
        }
        out += '</w:p>'
        return out
    }

    static async genPdf(article_id) {
        console.log('Generating DOCX')
        try{
            await ArticalController.genEndNote(article_id)
            await ArticalController.genXml(article_id)
            let theData = {
                //---global
                global_doi: Env.get('DOI'),
                //---journal
                journal_name: 'Journal of Genes and Cells',
                journal_vol: '3',
                jounral_n: '2017-Cell Therapy & Reg. Med.-I',
                journal_doi: 'gnc',
                image: '/Volumes/projects/erfan/erfan/public/static/img/journal/j_0.png',
                //---article
                header_author: 'Akhavanezayat et al.',
                author_italic: '',
                article_publish_month_year: 'January, 2017',
                article_pages: '39-46',
                article_doi: '55',
                article_type: 'Research',
                article_full_title: `Toxicity of Five Local Anesthesia Drugs on Cells and Multipotent Stem Cells`,
                article_submision_date: '24 November 2016',
                article_acceptance_date: '25 April 2017',
                article_abstract: '',
                article_keywords: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_introduction: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_material: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_disc: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_ack: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_results: '<w:p><w:r><w:t></w:t></w:r></w:p>',
                article_references: '<w:p><w:r><w:t></w:t></w:r></w:p>',
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
                corr_email: "\t",
                start_page: '1',
            }
            let baseDirAr = __dirname.split('/'), baseDir = ''
            for(var i = baseDirAr.length - 4;i>=0;i--) {
              baseDir = '/' + baseDirAr[i] + baseDir
            }
            baseDir = baseDir.substring(1)

            let theTypes = {
                "research": "Research",
                "non-research": "Non-Research"
            }
            let articleKeywordsHtml = '<p><strong>Keywords :</strong> '
            let allImages = [], theXML
            let theArticle = await Artical.query().where('id', article_id).with('journal').with('keyword.keyword').with('author').first()
            theArticle = theArticle.toJSON()
            try{
                theArticle.refs = JSON.parse(theArticle.refs)
            }catch(e){
                theArticle.refs = []
            }
            let theAuthors = await UserArticle.query().where('article_id', article_id).with('user.country').fetch()
            theAuthors = theAuthors.toJSON()
            //---journal
            theData.journal_name = theArticle.journal.name
            theData.journal_vol = theArticle.publish_vol
            theData.journal_n = theArticle.publish_no
            theData.journal_doi = theArticle.journal.doi_code
            theData.image = baseDir + '/public/static/img/journal/j_0.png'
            if(theArticle.journal.pdf_image_path && theArticle.journal.pdf_image_path!='') {
                theData.image = baseDir + '/public/' + theArticle.journal.pdf_image_path
            }

            //---article
            theData.header_author = theArticle.author.lname
            let authorCount = 1
            let authorsClassified = {
                // first: [
                //     theArticle.author,
                // ],
            }
            let authorAffs = [], affs = [], affIndex
            for(let userArticle of theAuthors) {
                affIndex = affs.indexOf(userArticle.user.department)
                if(affIndex<0) {
                    affIndex = affs.length
                    affs.push(userArticle.user.department + ((userArticle.user.university_institute && userArticle.user.university_institute!='')?' ,' + userArticle.user.university_institute:'') + ((userArticle.user.country)?' ,' + userArticle.user.country.COUNTRY_NAME:''))
                    authorAffs.push({
                        index: affIndex+1,
                        name: userArticle.user.department + ((userArticle.user.university_institute && userArticle.user.university_institute!='')?' ,' + userArticle.user.university_institute:'') + ((userArticle.user.country)?' ,' + userArticle.user.country.COUNTRY_NAME:''),
                    })
                }
                affIndex++
                // if(userArticle.users_id!=theArticle.author.id) {
                    authorCount++
                    if(!authorsClassified[userArticle.position]) {
                        authorsClassified[userArticle.position] = []
                    }
                    userArticle.user['aff_index'] = affIndex
                    authorsClassified[userArticle.position].push(userArticle.user)
                // }
            }
            affIndex = affs.indexOf(authorsClassified.first[0].department + ((authorsClassified.first[0].university_institute && authorsClassified.first[0].university_institute!='')?' ,' + authorsClassified.first[0].university_institute:'') + ((authorsClassified.first[0].country)?' ,' + authorsClassified.first[0].country.COUNTRY_NAME:''))
            if(affIndex<0) {
                affIndex = affs.length
                affs.push(authorsClassified.first[0].department + ((authorsClassified.first[0].university_institute && authorsClassified.first[0].university_institute!='')?' ,' + authorsClassified.first[0].university_institute:'') + ((authorsClassified.first[0].country)?' ,' + authorsClassified.first[0].country.COUNTRY_NAME:''))
                authorAffs.push({
                    index: affIndex+1,
                    name: authorsClassified.first[0].department + ((authorsClassified.first[0].university_institute && authorsClassified.first[0].university_institute!='')?' ,' + authorsClassified.first[0].university_institute:'') + ((authorsClassified.first[0].country)?' ,' + authorsClassified.first[0].country.COUNTRY_NAME:''),
                })
            }
            affIndex++
            authorsClassified.first[0]['aff_index'] = affIndex
            theData.author_affs = authorAffs
            theData.authors = []
            let firstAuthor = true
            for(let theAuth of authorsClassified.first) {
                theData.authors.push({
                    index: theAuth.aff_index,
                    name: ((firstAuthor)?'':' , ') + theAuth.fname + ' ' + theAuth.lname,
                })
                firstAuthor = false
            }
            if(authorsClassified.co) {
                for(let theAuth of authorsClassified.co) {
                    theData.authors.push({
                        index: theAuth.aff_index,
                        name: ' , ' + theAuth.fname + ' ' + theAuth.lname,
                    })
                }
            }
            if(authorsClassified.corresponding) {
                for(let theAuth of authorsClassified.corresponding) {
                    theData.authors.push({
                        index: theAuth.aff_index + '*',
                        name: ' , ' + theAuth.fname + ' ' + theAuth.lname,
                    })
                    theData.corr_email = theAuth.email
                }
            }
            if(authorCount==2) {
                if(authorsClassified.first.length>1) {
                    theData.header_author += ' and ' +  authorsClassified.first[1].lname
                }else if(authorsClassified['co']) {
                    theData.header_author += ' and ' +  authorsClassified.co[0].lname
                }else if(authorsClassified['corresponding']) {
                    theData.header_author += ' and ' +  authorsClassified.corresponding[0].lname
                }
            }else if(authorCount>2) {
                // theData.header_author += ' et al.'
                theData.author_italic = ' et al.'
            }
            theData.article_publish_month_year = moment(theArticle.publish_date).format('MMMM, YYYY')
            theData.article_pages = theArticle.publish_startpage + '-' + theArticle.publish_endpage
            theData.start_page = theArticle.publish_startpage
            theData.article_doi = theArticle.doi
            theData.article_type = theTypes[theArticle.type]
            theData.article_full_title = theArticle.full_title
            theData.article_submision_date = moment(theArticle.created_at).format('D MMMM YYYY')
            theData.article_acceptance_date = moment(theArticle.publish_date).format('D MMMM YYYY')
            
            theData.article_abstract = theArticle.abstract 
            // console.log('Keywords', theArticle.keyword)     

            let dkeywords = await ArticleDefinedKeyword.query().where('article_id', theArticle.id).pluck('theword')

            let isstart = true
            if((theArticle.keyword && theArticle.keyword.length>0)||(dkeywords.length>0)) {
                for(let keyW of theArticle.keyword) {
                    if(keyW.keyword) {
                        articleKeywordsHtml += keyW.keyword.theword + ((isstart)?'':' , ')
                        isstart = false
                    }
                }
                for(let keyW of dkeywords) {
                    if(keyW) {
                        articleKeywordsHtml += keyW + ((isstart)?'':' , ')
                        isstart = false
                    }
                }
                articleKeywordsHtml += '</p>'
                theXML = ArticalController.html2xml(articleKeywordsHtml)
                theData.article_keywords = theXML.xml
            }else {
                theData.article_keywords = '<w:p><w:r><w:t></w:t></w:r></w:p>'
            }
            


            theXML = ArticalController.html2xml(theArticle.introduction)
            allImages = allImages.concat(theXML.images)
            theData.article_introduction = theXML.xml
            
            theXML = ArticalController.html2xml(theArticle.material)
            allImages = allImages.concat(theXML.images)
            theData.article_material = theXML.xml

            theXML = ArticalController.html2xml(theArticle.disc)
            allImages = allImages.concat(theXML.images)
            theData.article_disc = theXML.xml

            theXML = ArticalController.html2xml(theArticle.ack)
            allImages = allImages.concat(theXML.images)
            theData.article_ack = theXML.xml

            theXML = ArticalController.html2xml(theArticle.results)
            allImages = allImages.concat(theXML.images)
            theData.article_results = theXML.xml
            

            if(theArticle.refs.length>0) {
                theData.article_references = ArticalController.ref2xml(theArticle.refs)
            }

            // console.log('The Data')
            // console.log(theData)
            let docxfile = await docx.fillTemplateWord(theData, 'gen_' + article_id, allImages)
            console.log('Docx file Result', docxfile)
            let pdfResult = await docx.docxToPdf(docxfile, 'gen_' + article_id)
            console.log('Pdf Result', pdfResult)
            let epubResult = await docx.docxToEpub(docxfile, 'gen_' + article_id)
            console.log('Epub Result', epubResult)
            return true
        }catch(e) {
            // console.log('Pdf Error')
            // console.log(e)
            return false
        }
    }

    static async genEndNote(article_id) {
        console.log('Genarting EndNote')
        let thisArticle = await Artical.find(article_id)
        if(!thisArticle) {
            console.log('article not found')
            return false
        }
        let theJournal = await Journal.find(thisArticle.journal_id)
        let userArticles = await UserArticle.query().where('article_id', article_id).with('user').fetch()
        userArticles = userArticles.toJSON()

        let journal_title = 'No Journal'
        if(theJournal) {
            journal_title = theJournal.name
        }
        let baseDirAr = __dirname.split('/'), baseDir = ''
        for(var i = baseDirAr.length - 4;i>=0;i--) {
          baseDir = '/' + baseDirAr[i] + baseDir
        }
        baseDir = baseDir.substring(1)
        if(fs.existsSync(baseDir + '/public/pdf/gen_' + article_id + '.enw')) {
          fs.unlinkSync(baseDir + '/public/pdf/gen_' + article_id + '.enw')
        }
        let endNoteTemplate = fs.readFileSync(baseDir + '/themplate.enw')
        let authors = ''
        if(thisArticle.author_id>0) {
            let author = await User.find(thisArticle.author_id)
            authors += '%A ' + author.lname + ', ' + author.fname
        }
        for(let userArticle of userArticles) {
            if(userArticle.users_id!=thisArticle.author_id) {
                authors +=  "\n" + '%A ' + userArticle.user.lname + ', ' + userArticle.user.fname
            }
        }

        let endNoteData = String(endNoteTemplate).replace(/#article_running_title#/g, thisArticle.running_title)
        endNoteData = endNoteData.replace(/#authors#/g, authors)
        endNoteData = endNoteData.replace(/#journal_title#/g, journal_title)
        endNoteData = endNoteData.replace(/#publish_volume#/g, thisArticle.publish_vol)
        endNoteData = endNoteData.replace(/#publish_number#/g, thisArticle.publish_no)
        endNoteData = endNoteData.replace(/#publish_pages#/g, thisArticle.publish_startpage + '-' + thisArticle.publish_endpage)
        endNoteData = endNoteData.replace(/#publish_year#/g, moment(thisArticle.publish_date).format('YYYY'))

        fs.writeFileSync(baseDir + '/public/pdf/gen_' + article_id + '.enw', endNoteData)
        console.log('EndNote Generated')
        return true
    }

    static html2realxml (inp, doi, baseDir) {
        if(inp==null || inp=='') {
            return '<p></p>'
        }
        const entities = new Entities()
        let out = striptags(inp, ['p', 'table', 'tr', 'td', 'a', 'img', 'section', 'title'], '')
        out = entities.decode(out)
      
        out = out.replace(/<strong>/g, `<sup>`)
        out = out.replace(/<\/strong>/g, `</sup>`)

        out = out.replace(/<section>/g, `<sec>`)
        out = out.replace(/<\/section>/g, `</sec>`)

        out = out.replace(/&nbsp;/g, ' ')

        let m, tmp, href, retmp, re, alt, extension
        // links
        re = /<\s*a[^>]*>/g
      
        do {
            m = re.exec(out)
            if (m) {
                tmp = out.substring(m.index+1).toLowerCase().split('href="')
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    if(tmp.indexOf('#')==0) {
                        href= tmp.replace(/#_enref/g, 'ref-')
                        retmp = new RegExp(m[0], 'g')
                        out = out.replace(retmp, `<xref ref-type="bibr" rid="${ href }">`)
                    }
                }
            }
        } while (m)
        out = out.replace(/<\/a>/g, `</xref>`)
        //\links
        // images
        re = /<\s*img[^>]*>/g
        let images = []
      
      
        let index = 1, imageTmp = '', imageTemp = `      
        <fig id="fig-#index#">
            <object-id pub-id-type="doi">${ doi }/fig-#index#</object-id>
            <label>Figure #index#</label>
            <caption>
            <title>#title#</title>
            </caption>
            <graphic mimetype="image" mime-subtype="#extension#" xlink:href="#src#" />
        </fig>`
        do {
            m = re.exec(out)
            if (m) {
                href = ''
                tmp = out.substring(m.index+1).toLowerCase().split('src="')
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    href= tmp
                }
                extension = (href.split('.')[1])?href.split('.')[1]:'png'
                alt = ''
                tmp = out.substring(m.index+1).toLowerCase().split('alt="')
                if(tmp.length>1) {
                    tmp = tmp[1].split('"')[0]
                    alt= tmp
                }
                retmp = new RegExp(m[0], 'g')
                imageTmp = imageTemp.replace(/#index#/g, index).replace(/#src#/g, baseDir + href)
                .replace(/#title#/g, alt).replace(/#extension#/g, extension)
                out = out.replace(retmp, `${ imageTmp}`)
                index++
            }
        } while (m)
        //\images
      
        return out
    }

    static ref2json(inp) {
        inp = String(inp)
        
        let publish_year = '', article_title = '', journal_name_tmp = [], publish_vol = '', publish_issue = '', journal_name = '', pages = '', label = ''
        let tmp, firstNames = []
        try{
            // Authors
            tmp = inp.split('(')[0]
            label = tmp
            firstNames = tmp.split('&')[0].split('.,')
            let i = 0
            for(i = 0;i < firstNames.length-1;i++) {
                firstNames[i] = {
                    fname : firstNames[i].split(',')[0].trim(),
                    lname : firstNames[i].split(',')[1].trim() + '.'
                }
            }
            firstNames[i] = {
                fname : firstNames[i].split(',')[0].trim(),
                lname : firstNames[i].split(',')[1].trim()
            }
            if(tmp.split('&')[1]) {
                firstNames.push({
                    fname : tmp.split('&')[1].split(',')[0].trim(),
                    lname : tmp.split('&')[1].split(',')[1].trim()
                })
            }
            // article
            publish_year = inp.split(';')[0].split(' ')[inp.split(';')[0].split(' ').length-2]
            article_title = inp.split(').')[1].split('.')[0]
            journal_name_tmp = inp.split(').')[1].split('.')[1].split(':')[0].split(' ')
            publish_vol = journal_name_tmp[journal_name_tmp.length-1].split('(')[0]
            publish_issue = (journal_name_tmp[journal_name_tmp.length-1].split('(')[1])?journal_name_tmp[journal_name_tmp.length-1].split('(')[1].split(')')[0]:''
            journal_name = journal_name_tmp.slice(0, journal_name_tmp.length-1).join(' ')
            pages = inp.split(':')[1].trim()
        }catch(e){}
        // console.log('Reference:')
        // console.log(inp)
        // console.log({
        //     authors: firstNames,
        //     publish_year: publish_year,
        //     article_title: article_title,
        //     journal_name: journal_name,
        //     publish_vol: publish_vol,
        //     publish_issue: publish_issue,
        //     pages: pages,
        //     label: label,
        //   })
        return {
          authors: firstNames,
          publish_year: publish_year,
          article_title: article_title,
          journal_name: journal_name,
          publish_vol: publish_vol,
          publish_issue: publish_issue,
          pages: pages,
          label: label,
        }
    }

    static async genXml(article_id) {
        console.log('Genarting XML')
        let thisArticle = await Artical.find(article_id)
        if(!thisArticle) {
            console.log('article not found')
            return false
        }
        let theJournal = await Journal.find(thisArticle.journal_id)
        let journal_title = 'No Journal'
        if(theJournal) {
            journal_title = theJournal.name
        }

        let baseDirAr = __dirname.split('/'), baseDir = ''
        for(var i = baseDirAr.length - 4;i>=0;i--) {
          baseDir = '/' + baseDirAr[i] + baseDir
        }
        baseDir = baseDir.substring(1)
        if(fs.existsSync(baseDir + '/public/pdf/gen_' + article_id + '.xml')) {
          fs.unlinkSync(baseDir + '/public/pdf/gen_' + article_id + '.xml')
        }
        let xmlTemplate = fs.readFileSync(baseDir + '/themplate.xml')
        //----------AUTHOR----------------
        let userArticles = await UserArticle.query().where('article_id', article_id).with('user.country').fetch()
        userArticles = userArticles.toJSON()
        let authors = ''
        let authors_head = ''
        let authorTemplate = `
        <contrib id="author-#id#" contrib-type="#fname# #lname#">
            <name name-style="western">
                <surname>#lname#</surname>
                <given-names>#fname#</given-names>
            </name>
            <author-profile name-style="western">
            <contrib-profile-id contrib-id-type="iMaQPress Authors">
                #imaq_profile#
            </contrib-id>
            <contrib-profile-id-1 contrib-id-type="google scholar">
                #author_scholar_profile#
            </contrib-id>
            </author-profile>
            <xref ref-type="affiliation" rid="affiliation-1">#aff#</xref>
            #email#
        </contrib>`
        let affTemplate = `
        <affiliation id="affiliation-#indx#"><label>#indx#</label>
            <institution>
                #department#
            </institution>,  
            <country>
                #country#
            </country>
        </affiliation>
        `
        let authorsClassified = {}, articleAuthor
        
        if(thisArticle.author_id>0) {
            articleAuthor = await User.find(thisArticle.author_id)
            await articleAuthor.loadMany(['country'])
            if(articleAuthor) {
                authorsClassified = {
                    first: [
                        articleAuthor.toJSON(),
                    ],
                }
            }
        }
        let authorAffs = [], affs = [], affIndex, authorCount=0
        for(let userArticle of userArticles) {
            affIndex = affs.indexOf(userArticle.user.department)
            if(affIndex<0) {
                affIndex = affs.length
                affs.push(userArticle.user.department)
                authorAffs.push({
                    index: affIndex+1,
                    name: (userArticle.user)?userArticle.user.department:'',
                    country: (userArticle.user && userArticle.user.country)?userArticle.user.country.COUNTRY_NAME:'',
                })
            }
            affIndex++
            if(articleAuthor && userArticle.users_id!=articleAuthor.id) {
                authorCount++
                if(!authorsClassified[userArticle.position]) {
                    authorsClassified[userArticle.position] = []
                }
                userArticle.user['aff_index'] = affIndex
                authorsClassified[userArticle.position].push(userArticle.user)
            }
        }

        if(authorsClassified.first) {
            affIndex = affs.indexOf(authorsClassified.first[0].department)
            if(affIndex<0) {
                affIndex = affs.length
                affs.push(authorsClassified.first[0].department)
                authorAffs.push({
                    index: affIndex+1,
                    name: authorsClassified.first[0].department,
                    country: authorsClassified.first[0].country.COUNTRY_NAME,
                })
            }
            affIndex++
            authorsClassified.first[0]['aff_index'] = affIndex
        }

        let author_affs_xml = ''
        for(let af of authorAffs) {
            author_affs_xml += affTemplate.replace(/#indx#/g, af.index).replace(/#department#/g, af.name)
            .replace(/#country#/g, af.country)
        }

        let firstAuthorFound = false
        let moreThanTwo = false
        let secondAuther = false
        if(authorsClassified.first) {
            for(let author of authorsClassified.first) {
                let maq_profile = `${Env.get('APP_URL')}/author/${ author.fname }-${ author.lname }`
                if(author.name_index!=0){
                    maq_profile += '-' + author.name_index
                }
                authors += authorTemplate.replace(/#id#/g, author.id).replace(/#fname#/g, author.fname)
                .replace(/#lname#/g, author.lname).replace(/#imaq_profile#/g, maq_profile)
                .replace(/#author_scholar_profile#/g, author.academic_page).replace(/#aff#/g, author.aff_index)
                .replace(/#email#/g, '')
                if(!firstAuthorFound) {
                    authors_head = author.lname
                    firstAuthorFound = true
                }else if(!moreThanTwo && secondAuther===false){
                    secondAuther = author.lname
                }else if(!moreThanTwo && secondAuther!==false){
                    moreThanTwo = true
                }
            }
        }
        if(authorsClassified.co) {
            for(let author of authorsClassified.co) {
                let maq_profile = `${Env.get('APP_URL')}/author/${ author.fname }-${ author.lname }`
                if(author.name_index!=0){
                    maq_profile += '-' + author.name_index
                }
                authors += authorTemplate.replace(/#id#/g, author.id).replace(/#fname#/g, author.fname)
                .replace(/#lname#/g, author.lname).replace(/#imaq_profile#/g, maq_profile)
                .replace(/#author_scholar_profile#/g, author.academic_page).replace(/#aff#/g, author.aff_index)
                .replace(/#email#/g, '')
                if(!firstAuthorFound) {
                    authors_head = author.lname
                    firstAuthorFound = true
                }else if(!moreThanTwo && secondAuther===false){
                    secondAuther = author.lname
                }else if(!moreThanTwo && secondAuther!==false){
                    moreThanTwo = true
                }
            }
        }
        if(authorsClassified.corresponding) {
            for(let author of authorsClassified.corresponding) {
                let maq_profile = `${Env.get('APP_URL')}/author/${ author.fname }-${ author.lname }`
                if(author.name_index!=0){
                    maq_profile += '-' + author.name_index
                }
                authors += authorTemplate.replace(/#id#/g, author.id).replace(/#fname#/g, author.fname)
                .replace(/#lname#/g, author.lname).replace(/#imaq_profile#/g, maq_profile)
                .replace(/#author_scholar_profile#/g, author.academic_page).replace(/#aff#/g, author.aff_index)
                .replace(/#email#/g, `<email>${author.email}</email>`)
                if(!firstAuthorFound) {
                    authors_head = author.lname
                    firstAuthorFound = true
                }else if(!moreThanTwo && secondAuther===false){
                    secondAuther = author.lname
                }else if(!moreThanTwo && secondAuther!==false){
                    moreThanTwo = true
                }
            }
        }
        if(moreThanTwo) {
            authors_head += ' et al.'
        }else if(secondAuther!==false) {
            authors_head += ' and ' + secondAuther
        }
        //\---------AUTHOR----------------
        //----------KEYWORD---------------
        let articleKeywords = await ArticleKeyword.query().where('article_id', article_id).with('keyword').fetch()
        articleKeywords = articleKeywords.toJSON()

        let keywords = ''
        let keyWordCatagory = {
            'c1': [],
            'c2': [],
            'c3': [],
        }
        for(let articleKeyword of articleKeywords) {
            if(articleKeyword.keyword) {
                keyWordCatagory[articleKeyword.keyword.category].push(articleKeyword.keyword.theword)
            }
        }
        for(let keyword of keyWordCatagory.c1) {
            keywords += `<subject>Catecgory 1 ${ keyword }</subject>`
        }
        for(let keyword of keyWordCatagory.c2) {
            keywords += `<subject>Catecgory 2 ${ keyword }</subject>`
        }
        for(let keyword of keyWordCatagory.c3) {
            keywords += `<subject>Catecgory 3 ${ keyword }</subject>`
        }
        //\---------KEYWORD---------------
        //----------EDITORS---------------
        let articleEditors = await UserArticleEditor.query().where('article_id', thisArticle.id).with('user').fetch()
        articleEditors = articleEditors.toJSON()
        // console.log('Article Editors where article_id = ', thisArticle.id, articleEditors)
        let editorTemplate = `
        <contrib contrib-type="editor">
          <name name-style="western">
            <surname>#lname#</surname>
            <given-names>#fname#</given-names>
          </name>
        </contrib>
        `
        let editors = ''
        for(let theEditor of articleEditors) {
            editors += editorTemplate.replace(/#fname#/g, theEditor.user.fname)
            .replace(/#lname#/g, theEditor.user.lname)
        }

        let chiefEditor = ''
        let chiefEditorUser = await User.query().where('group_id', 2).where('journal_id', thisArticle.journal_id).first()
        if(chiefEditorUser) {
            chiefEditor = chiefEditorUser.fname + ' ' + chiefEditorUser.lname
        }
        //\---------EDITORS---------------
        //----------ABSTRACT--------------
        let abstractKeywords = ''
        let abstractKeywordsArr = await ArticalController.getKeywordsOf(thisArticle.abstract)
        for(let keyW of abstractKeywordsArr) {
            abstractKeywords += `<kwd>${ keyW }</kwd>`
        }
        //\---------ABSTRACT--------------
        //----------REFERENCE--------------
        let articleRefs = ''
        const articleRefNameTemplate = `
        <name>
            <surname>#lname#</surname>
            <given-names>#fname#</given-names>
        </name>
        `
        const articleRefTemplate = `
        <ref id="ref-#index#">
            <label>#label#</label>
            <element-citation publication-type="journal">
            <person-group person-group-type="author">
            #names#
            </person-group>
            <article-title>
            #ref_article_title#
            </article-title>
            <source>#journal_name#</source>
            <year iso-8601-date="#publish_year#">#publish_year#</year>
            <volume>#publish_vol#</volume>
            <issue>#publish_issue#</issue>
            <elocation-id>#article_id#</elocation-id>
            <pub-id pub-id-type="doi">#doi#</pub-id>
            </element-citation>
        </ref>
        `
        let refsArray = []
        try{
            refsArray = JSON.parse(thisArticle.refs)
        }catch(e) {}
        let indx = 1
        for(let theRef of refsArray) {
            let refData = ArticalController.ref2json(theRef)
            let names = ''
            for(let theName of refData.authors) {
                names += articleRefNameTemplate.replace(/#fname#/g, theName.fname).replace(/#lname#/g, theName.lname)
            }
            articleRefs += articleRefTemplate.replace(/#names#/g, names).replace(/#ref_article_title#/g, refData.article_title)
            .replace(/#journal_name#/g, refData.journal_name).replace(/#publish_vol#/g, refData.publish_vol)
            .replace(/#publish_issue#/g, refData.publish_issue).replace(/#article_id#/g, '').replace(/#doi#/g, '')
            .replace(/#index#/g, indx).replace(/#publish_year#/g, refData.publish_year).replace(/#label#/g, refData.label)
            indx++
        }
        //\---------REFERENCE--------------
        let xmlData = String(xmlTemplate).replace(/#article_running_title#/g, thisArticle.running_title)
        xmlData = xmlData.replace(/#article_type#/g, thisArticle.type + '-article')
        xmlData = xmlData.replace(/#journal_title#/g, journal_title)
        xmlData = xmlData.replace(/#journal_issn#/g, theJournal.issn)
        xmlData = xmlData.replace(/#publish_number#/g, thisArticle.publish_no)
        xmlData = xmlData.replace(/#doi#/g, Env.get('DOI') + '/' + theJournal.doi_code + '.' + thisArticle.doi)
        xmlData = xmlData.replace(/#keywords#/g, keywords)
        xmlData = xmlData.replace(/#article_full_title#/g, thisArticle.full_title)
        xmlData = xmlData.replace(/#authors#/g, authors)
        xmlData = xmlData.replace(/#author_affs#/g, author_affs_xml)
        xmlData = xmlData.replace(/#editors#/g, editors)
        xmlData = xmlData.replace(/#article_publish_vol#/g, thisArticle.publish_vol)
        xmlData = xmlData.replace(/#article_id#/g, thisArticle.id)
        xmlData = xmlData.replace(/#article_created_at#/g, moment(thisArticle.created_at).format('YYYY-MM-DD'))
        xmlData = xmlData.replace(/#article_created_at_day#/g, moment(thisArticle.created_at).format('D'))
        xmlData = xmlData.replace(/#article_created_at_month#/g, moment(thisArticle.created_at).format('M'))
        xmlData = xmlData.replace(/#article_created_at_year#/g, moment(thisArticle.created_at).format('YYYY'))
        xmlData = xmlData.replace(/#article_publish_date#/g, moment(thisArticle.publish_date).format('YYYY-MM-DD'))
        xmlData = xmlData.replace(/#article_publish_date_day#/g, moment(thisArticle.publish_date).format('D'))
        xmlData = xmlData.replace(/#article_publish_date_month#/g, moment(thisArticle.publish_date).format('M'))
        xmlData = xmlData.replace(/#article_publish_date_year#/g, moment(thisArticle.publish_date).format('YYYY'))
        xmlData = xmlData.replace(/#authors_head#/g, authors_head)
        xmlData = xmlData.replace(/#article_publish_link#/g, `${Env.get('APP_URL')}/article/${ thisArticle.running_title.replace(/ /g, '-') }`)
        xmlData = xmlData.replace(/#article_abstract#/g, (thisArticle.abstract)?thisArticle.abstract:'')
        xmlData = xmlData.replace(/#article_abstract_keywords#/g, abstractKeywords)
        xmlData = xmlData.replace(/#article_ack#/g, thisArticle.ack)
        xmlData = xmlData.replace(/#article_summery#/g, thisArticle.summery)
        xmlData = xmlData.replace(/#article_running_title#/g, thisArticle.running_title)
        xmlData = xmlData.replace(/#chief_editor#/g, chiefEditor)
        xmlData = xmlData.replace(/#article_introduction#/g, ArticalController.html2realxml(thisArticle.abstract, Env.get('DOI') + '/' + theJournal.doi_code + '.' + thisArticle.doi, baseDir + '/public'))
        xmlData = xmlData.replace(/#article_disc#/g, ArticalController.html2realxml(thisArticle.disc, Env.get('DOI') + '/' + theJournal.doi_code + '.' + thisArticle.doi, baseDir + '/public'))
        xmlData = xmlData.replace(/#article_material#/g, ArticalController.html2realxml(thisArticle.material, Env.get('DOI') + '/' + theJournal.doi_code + '.' + thisArticle.doi, baseDir + '/public'))
        xmlData = xmlData.replace(/#article_results#/g, ArticalController.html2realxml(thisArticle.results, Env.get('DOI') + '/' + theJournal.doi_code + '.' + thisArticle.doi, baseDir + '/public'))
        xmlData = xmlData.replace(/#article_refs#/g, articleRefs)
        fs.writeFileSync(baseDir + '/public/pdf/gen_' + article_id + '.xml', xmlData)
        console.log('XML Generated')
        return true
    }
    async test ({ view, response, session, request, params }) {
        if(params && params.article_id) {
            ArticalController.genPdf(params.article_id)
        }
        return 'OK'
    }
    async pdf ({ view, response, session, request, params }) {
        if(params && params.article_id) {
            let article_id = params.article_id
            let article = await Artical.query().where('id', article_id).first()
            if(article) {
                let baseDirAr = __dirname.split('/'), baseDir = ''
                for(var i = baseDirAr.length - 4;i>=0;i--) {
                  baseDir = '/' + baseDirAr[i] + baseDir
                }
                baseDir = baseDir.substring(1)
                if(fs.existsSync(baseDir + '/public/pdf/gen_' + article_id + '.pdf')) {
                    article.downloads++
                    article.save()
                    return response.download(baseDir + '/public/pdf/gen_' + article_id + '.pdf')
                }
            }
        }
        return 'File Not found!'
    }

    async epub ({ view, response, session, request, params }) {
        if(params && params.article_id) {
            let article_id = params.article_id
            let article = await Artical.query().where('id', article_id).first()
            if(article) {
                let baseDirAr = __dirname.split('/'), baseDir = ''
                for(var i = baseDirAr.length - 4;i>=0;i--) {
                  baseDir = '/' + baseDirAr[i] + baseDir
                }
                baseDir = baseDir.substring(1)
                if(fs.existsSync(baseDir + '/public/pdf/gen_' + article_id + '.epub')) {
                    article.downloads++
                    article.save()
                    return response.download(baseDir + '/public/pdf/gen_' + article_id + '.epub')
                }
            }
        }
        return 'File Not found!'
    }

    async endnote ({ view, response, session, request, params }) {
        if(params && params.article_id) {
            let article_id = params.article_id
            let article = await Artical.query().where('id', article_id).first()
            if(article) {
                let baseDirAr = __dirname.split('/'), baseDir = ''
                for(var i = baseDirAr.length - 4;i>=0;i--) {
                  baseDir = '/' + baseDirAr[i] + baseDir
                }
                baseDir = baseDir.substring(1)
                if(fs.existsSync(baseDir + '/public/pdf/gen_' + article_id + '.enw')) {
                    article.citiations++
                    // article.downloads++
                    article.save()
                    return response.redirect('/pdf/gen_' + article_id + '.enw')
                }
            }
        }
        return 'File Not found!'
    }
}

module.exports = ArticalController