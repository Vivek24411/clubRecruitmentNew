const { validationResult } = require("express-validator");
const { destroyUploadedFile } = require("../utils/uploads");

async function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  await Promise.all([req.file, ...(req.files || [])].filter(Boolean).map(destroyUploadedFile));

  return res.status(400).json({
    success: false,
    msg: "Please correct the highlighted fields",
    errors: errors.array(),
  });
}

module.exports = validateRequest;
