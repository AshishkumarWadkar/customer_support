/**
 * Standardized API response formatter
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = 'Created successfully') => {
  return sendSuccess(res, data, message, 201);
};

const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
  const meta = {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / limit),
  };
  return sendSuccess(res, data, message, 200, meta);
};

const sendNoContent = (res) => {
  return res.status(204).send();
};

const sendError = (res, message = 'An error occurred', statusCode = 500, errors = null, code = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  if (code) response.code = code;
  return res.status(statusCode).json(response);
};

module.exports = { sendSuccess, sendCreated, sendPaginated, sendNoContent, sendError };
