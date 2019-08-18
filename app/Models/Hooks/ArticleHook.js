'use strict'

const ArticleHistory = use('App/Models/ArticleHistory')
const ArticleHook = exports = module.exports = {}

ArticleHook.copy = async (modelInstance) => {
  let data = modelInstance.toJSON()
  data['article_id'] = data.id
  delete data.id
  delete data.journal
  delete data.editors
  delete data.author
  delete data.created_at
  delete data.updated_at
  ArticleHistory.create(data)
}
