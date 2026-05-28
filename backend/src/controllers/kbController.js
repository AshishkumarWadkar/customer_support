const kbService = require('../services/kbService');
const { sendSuccess, sendCreated, sendPaginated, sendNoContent } = require('../utils/responseUtils');

const list = async (req, res, next) => {
  try {
    const { rows, total, page, limit } = await kbService.getArticles(req.query, req.user);
    return sendPaginated(res, rows, page, limit, total);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const article = await kbService.getArticleById(req.params.id, req.user, req.userPermissions);
    return sendSuccess(res, article);
  } catch (err) {
    next(err);
  }
};

const create = async (req, res, next) => {
  try {
    const article = await kbService.createArticle(req.body, req.user);
    return sendCreated(res, article, 'Article created successfully');
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const article = await kbService.updateArticle(req.params.id, req.body, req.user);
    return sendSuccess(res, article, 'Article updated successfully');
  } catch (err) {
    next(err);
  }
};

const remove = async (req, res, next) => {
  try {
    await kbService.deleteArticle(req.params.id, req.user);
    return sendNoContent(res);
  } catch (err) {
    next(err);
  }
};

const submit = async (req, res, next) => {
  try {
    const article = await kbService.submitForReview(req.params.id, req.user);
    return sendSuccess(res, article, 'Article submitted for review');
  } catch (err) {
    next(err);
  }
};

const publish = async (req, res, next) => {
  try {
    const article = await kbService.publishArticle(req.params.id, req.user);
    return sendSuccess(res, article, 'Article published successfully');
  } catch (err) {
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const article = await kbService.rejectArticle(req.params.id, req.user);
    return sendSuccess(res, article, 'Article rejected and returned to draft');
  } catch (err) {
    next(err);
  }
};

const archive = async (req, res, next) => {
  try {
    const article = await kbService.archiveArticle(req.params.id, req.user);
    return sendSuccess(res, article, 'Article archived successfully');
  } catch (err) {
    next(err);
  }
};

const getVersions = async (req, res, next) => {
  try {
    const versions = await kbService.getVersionHistory(req.params.id, req.user, req.userPermissions);
    return sendSuccess(res, versions);
  } catch (err) {
    next(err);
  }
};

const getVersion = async (req, res, next) => {
  try {
    const version = await kbService.getVersionSnapshot(
      req.params.id,
      req.params.versionId,
      req.user,
      req.userPermissions
    );
    return sendSuccess(res, version);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  submit,
  publish,
  reject,
  archive,
  getVersions,
  getVersion,
};
