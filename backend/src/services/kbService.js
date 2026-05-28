const kbRepo = require('../repositories/kbRepository');
const { NotFoundError, ForbiddenError, ValidationError, ConflictError } = require('../middlewares/errorMiddleware');
const { ROLES } = require('../constants/roles');
const logger = require('../utils/logger');

// ─── Allowed status transitions ────────────────────────────────────────────
//
//  draft          → pending_review  (submit for review — kb.create)
//  pending_review → published       (publish — kb.publish)
//  pending_review → draft           (reject back to draft — kb.publish)
//  published      → archived        (archive — kb.publish)
//
const STATUS_TRANSITIONS = {
  draft:          ['pending_review'],
  pending_review: ['published', 'draft'],
  published:      ['archived'],
  archived:       [],
};

// ─── Visibility helper ─────────────────────────────────────────────────────

/**
 * Customers can only see published, public articles.
 * Staff with kb.view_internal can see internal articles too.
 * All other staff can see non-deleted articles at any status.
 */
const canViewArticle = (article, user, userPermissions = new Set()) => {
  if (user.role === ROLES.CUSTOMER) {
    return article.status === 'published' && article.is_public;
  }
  // Internal articles require explicit permission
  if (!article.is_public && !userPermissions.has('kb.view_internal')) {
    return false;
  }
  return true;
};

// ─── Slug generator ────────────────────────────────────────────────────────

const generateSlug = (title) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

// ─── Service methods ───────────────────────────────────────────────────────

/**
 * Create a new KB article (draft).
 * The calling route must have already enforced kb.create permission.
 */
const createArticle = async (data, user) => {
  const { title, body, categoryId, excerpt, isPublic, changeNote } = data;

  if (!title || !title.trim()) throw new ValidationError('Title is required');
  if (!body || !body.trim()) throw new ValidationError('Body is required');

  // Build and de-duplicate slug
  let slug = data.slug ? data.slug.trim() : generateSlug(title);
  if (await kbRepo.slugExists(slug)) {
    slug = `${slug}-${Date.now()}`;
  }

  const article = await kbRepo.create({
    categoryId: categoryId || null,
    title: title.trim(),
    slug,
    body,
    excerpt: excerpt || null,
    isPublic: isPublic !== undefined ? isPublic : true,
    createdBy: user.id,
  });

  // Snapshot version 1
  await kbRepo.snapshotVersion(
    article.id,
    1,
    article.title,
    article.body,
    user.id,
    changeNote || 'Initial draft'
  );

  logger.info(`KB article #${article.id} "${article.title}" created by user ${user.id}`);
  return article;
};

/**
 * Update an article's content.
 * Only allowed when status is 'draft' or 'pending_review'.
 * Increments version and snapshots.
 * The calling route must have already enforced kb.create permission.
 */
const updateArticle = async (id, data, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (!['draft', 'pending_review'].includes(article.status)) {
    throw new ValidationError(
      `Cannot edit an article with status '${article.status}'. Only draft or pending_review articles can be edited.`
    );
  }

  const { title, body, categoryId, excerpt, isPublic, changeNote } = data;

  // Validate slug uniqueness if explicitly provided
  if (data.slug && data.slug !== article.slug) {
    if (await kbRepo.slugExists(data.slug, id)) {
      throw new ConflictError('An article with this slug already exists');
    }
  }

  const newVersion = article.version + 1;
  const updatedTitle = title !== undefined ? title.trim() : article.title;
  const updatedBody  = body  !== undefined ? body          : article.body;

  const fields = { version: newVersion };
  if (title      !== undefined) fields.title       = updatedTitle;
  if (body       !== undefined) fields.body        = updatedBody;
  if (data.slug  !== undefined) fields.slug        = data.slug;
  if (categoryId !== undefined) fields.category_id = categoryId;
  if (excerpt    !== undefined) fields.excerpt     = excerpt;
  if (isPublic   !== undefined) fields.is_public   = isPublic ? 1 : 0;

  const updated = await kbRepo.update(id, fields, user.id);

  // Snapshot the new version
  await kbRepo.snapshotVersion(
    id,
    newVersion,
    updatedTitle,
    updatedBody,
    user.id,
    changeNote || null
  );

  logger.info(`KB article #${id} updated to version ${newVersion} by user ${user.id}`);
  return updated;
};

/**
 * Submit a draft article for review: draft → pending_review.
 */
const submitForReview = async (id, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (article.status !== 'draft') {
    throw new ValidationError(`Only draft articles can be submitted for review (current status: '${article.status}')`);
  }

  const updated = await kbRepo.update(id, { status: 'pending_review' }, user.id);
  logger.info(`KB article #${id} submitted for review by user ${user.id}`);
  return updated;
};

/**
 * Publish an article: pending_review → published.
 * Requires kb.publish permission (enforced at route level).
 * Records reviewed_by, reviewed_at, and published_at.
 */
const publishArticle = async (id, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (article.status !== 'pending_review') {
    throw new ValidationError(
      `Only articles in 'pending_review' can be published (current status: '${article.status}')`
    );
  }

  const now = new Date();
  const updated = await kbRepo.update(
    id,
    {
      status:      'published',
      reviewed_by: user.id,
      reviewed_at: now,
      published_at: now,
    },
    user.id
  );

  logger.info(`KB article #${id} published by user ${user.id}`);
  return updated;
};

/**
 * Reject an article back to draft: pending_review → draft.
 * Requires kb.publish permission (enforced at route level).
 */
const rejectArticle = async (id, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (article.status !== 'pending_review') {
    throw new ValidationError(
      `Only articles in 'pending_review' can be rejected (current status: '${article.status}')`
    );
  }

  const updated = await kbRepo.update(id, { status: 'draft' }, user.id);
  logger.info(`KB article #${id} rejected back to draft by user ${user.id}`);
  return updated;
};

/**
 * Archive a published article: published → archived.
 * Requires kb.publish permission (enforced at route level).
 */
const archiveArticle = async (id, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (article.status !== 'published') {
    throw new ValidationError(
      `Only published articles can be archived (current status: '${article.status}')`
    );
  }

  const updated = await kbRepo.update(id, { status: 'archived' }, user.id);
  logger.info(`KB article #${id} archived by user ${user.id}`);
  return updated;
};

/**
 * List articles with pagination and filters.
 * Customers see only published public articles.
 * Staff without kb.view_internal see only public articles (any status).
 * Staff with kb.view_internal see all articles including internal ones.
 */
const getArticles = async (query, user, userPermissions = new Set()) => {
  const includeNonPublished = user.role !== ROLES.CUSTOMER;

  if (user.role === ROLES.CUSTOMER) {
    // Customers: published + public only
    query = { ...query, status: 'published', isPublic: true };
  } else if (!userPermissions.has('kb.view_internal')) {
    // Staff without kb.view_internal: exclude internal (non-public) articles
    query = { ...query, isPublic: true };
  }
  // Staff with kb.view_internal: no additional filter — see everything

  return kbRepo.findAll(query, includeNonPublished);
};

/**
 * Get a single article by ID.
 * Visibility rules are applied based on user role and permissions.
 */
const getArticleById = async (id, user, userPermissions = new Set()) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  if (!canViewArticle(article, user, userPermissions)) {
    throw new ForbiddenError('You do not have access to this article');
  }

  return article;
};

/**
 * Soft-delete an article. Managers and Super Admins only.
 */
const deleteArticle = async (id, user) => {
  const article = await kbRepo.findById(id);
  if (!article) throw new NotFoundError('KB Article');

  await kbRepo.softDelete(id);
  logger.info(`KB article #${id} soft-deleted by user ${user.id}`);
};

/**
 * Return full version history for an article.
 */
const getVersionHistory = async (articleId, user, userPermissions = new Set()) => {
  const article = await kbRepo.findById(articleId);
  if (!article) throw new NotFoundError('KB Article');

  if (!canViewArticle(article, user, userPermissions)) {
    throw new ForbiddenError('You do not have access to this article');
  }

  return kbRepo.getVersions(articleId);
};

/**
 * Return a single version snapshot.
 */
const getVersionSnapshot = async (articleId, versionId, user, userPermissions = new Set()) => {
  const article = await kbRepo.findById(articleId);
  if (!article) throw new NotFoundError('KB Article');

  if (!canViewArticle(article, user, userPermissions)) {
    throw new ForbiddenError('You do not have access to this article');
  }

  const version = await kbRepo.getVersionById(articleId, versionId);
  if (!version) throw new NotFoundError('Version snapshot');

  return version;
};

module.exports = {
  createArticle,
  updateArticle,
  submitForReview,
  publishArticle,
  rejectArticle,
  archiveArticle,
  getArticles,
  getArticleById,
  deleteArticle,
  getVersionHistory,
  getVersionSnapshot,
};
