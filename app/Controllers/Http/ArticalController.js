'use strict'

const Artical = use('App/Models/Artical')
const Journal = use('App/Models/Journal')
const User = use('App/Models/User')
const UserArticle = use('App/Models/UserArticle')
const UserArticleEditor = use('App/Models/UserArticleEditor')
const Helpers = use('Helpers')
const Mail = use('Mail')

class ArticalController {
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
            session.put('msg', 'You need to Login or Signup first')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        let partners = await User.query().select('university_institute').groupBy('university_institute').fetch()
        partners =  partners.toJSON()

        if(request.method()=='GET') {
            let journals = await Journal.all()
            let theJournalId  = (request.all()['thejournal_id'])?parseInt(request.all()['thejournal_id'],10):-1

            return view.render('artical.create', { 
                isLogged: isLogged,
                user: user,
                msg: msg,
                msg_type: msg_type,
                journals: journals.toJSON(),
                thejournal_id: theJournalId,
                partners: partners
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

    async createForJournal ({ view, response, session, request }) {
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

        if(!session.get('selected_journal')) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.route('home', {isLogged: isLogged})
        }

        let partners = await User.query().select('university_institute').groupBy('university_institute').fetch()
        partners =  partners.toJSON()

        if(request.method()=='GET') {
            let journals = await Journal.all()
            let theJournalId  = parseInt(session.get('selected_journal'), 10)

            return view.render('artical.create', { 
                isLogged: isLogged,
                user: user,
                msg: msg,
                msg_type: msg_type,
                journals: journals.toJSON(),
                thejournal_id: theJournalId,
                partners: partners,
                disableJournal: true
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

        // console.log('Params', params)
        if(!params || !params.article_id || isNaN(parseInt(params.article_id, 10))) {
            session.put('msg', 'Wrong Usage')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }

        let partners = await User.query().select('university_institute').groupBy('university_institute').fetch()
        partners =  partners.toJSON()

        let uploadedImage = '', selected_editor = -1

        let mainArticle = await Artical.query().with('author').with('editors').where('id', parseInt(params.article_id, 10)).first()
        if(!mainArticle) {
            session.put('msg', 'Article Not Found')
            session.put('msg_type', 'danger')
            return response.redirect('/admin')
        }
        
        await mainArticle.getScholar()

        let article = mainArticle.toJSON()
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
            }else if(request.all()['editor_email']) {
                let assignEditor = await User.query().where('email', request.all()['editor_email']).first()
                if(!assignEditor) {
                    session.put('msg', 'Email not Registered!')
                    session.put('msg_type', 'danger')
                    return response.redirect('/article_id/' + article.id)
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
                        await Mail.send('emails.welcome', {}, (message) => {
                            message.from('info@imaqpress.com')
                            message.to(request.all()['editor_email'])
                            message.subject('Subjected Mail')
                        })
                    }catch(e) {
                        console.log('Send Mail Error')
                        console.log(e)
                    }
                }
            }else if(request.all()['radios3']) {
                mainArticle.status = request.all()['radios3']
                await mainArticle.save()
                article.status = mainArticle.status
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
            partners: partners,
            uploadedImage: uploadedImage,
            selected_editor: selected_editor
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

        let partners = await User.query().select('university_institute').groupBy('university_institute').fetch()
        partners =  partners.toJSON()

        params.article_name = params.article_name.replace(/-/g, ' ')

        let theArticle = await Artical.query().with('journal').with('author').where('running_title', params.article_name).first()
        // console.log('theArticle', theArticle)
        if(!theArticle) {
            // console.log('Not Found!', theArticle)
            session.put('msg', 'Article Not Found1')
            session.put('msg_type', 'danger')
            return response.redirect('/')
        }
        // console.log('!!!!!')
        let article = theArticle.toJSON()
        let otherAuthors = await UserArticle.query().with('user').where('article_id', theArticle.id).whereNot('users_id', article.author.id).whereNot('position', 'corresponding').fetch()
        otherAuthors = otherAuthors.toJSON()

        let corAuthors = await UserArticle.query().with('user.country').where('article_id', theArticle.id).whereNot('users_id', article.author.id).where('position', 'corresponding').fetch()
        corAuthors = corAuthors.toJSON()
        console.log('CorAuthors', corAuthors)
        
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
            partners: partners
        })
    }
}

module.exports = ArticalController