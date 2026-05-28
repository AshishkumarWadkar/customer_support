const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/rbacMiddleware');
const { ROLES } = require('../constants/roles');

const ALL_STAFF = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT];
const MANAGERS_UP = [ROLES.SUPER_ADMIN, ROLES.MANAGER];
const ALL = [ROLES.SUPER_ADMIN, ROLES.MANAGER, ROLES.AGENT, ROLES.CUSTOMER];

router.use(authenticate);

// Static sub-routes must come BEFORE /:id to avoid param collision
router.get('/agents', authorize(ALL_STAFF), ticketController.listAgents);
router.get('/search', authorize(ALL_STAFF), ticketController.search);

router.get('/',     authorize(ALL_STAFF),  ticketController.list);
router.post('/',    authorize(ALL),        ticketController.create);
router.get('/:id',  authorize(ALL),        ticketController.getById);
router.put('/:id',  authorize(ALL_STAFF),  ticketController.update);
router.delete('/:id', authorize(MANAGERS_UP), ticketController.remove);

router.post('/:id/comments',  authorize(ALL),        ticketController.addComment);
router.post('/:id/links',     authorize(ALL_STAFF),  ticketController.createLink);
router.delete('/:id/links/:linkId', authorize(ALL_STAFF), ticketController.deleteLink);
router.put('/:id/assign',     authorize(MANAGERS_UP), ticketController.assign);
router.put('/:id/escalate',   authorize(ALL_STAFF),  ticketController.escalate);
router.post('/:id/tags',      authorize(ALL_STAFF),  ticketController.addTags);
router.get('/:id/history',    authorize(ALL_STAFF),  ticketController.getHistory);
router.post('/:id/csat',      authorize([ROLES.CUSTOMER]), ticketController.submitCSAT);

module.exports = router;
