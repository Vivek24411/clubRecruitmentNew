const { validationResult } = require("express-validator");
const { destroyUploadedFile } = require("../utils/uploads");

async function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  await destroyUploadedFile(req.file);

  return res.status(400).json({
    success: false,
    msg: "Please correct the highlighted fields",
    errors: errors.array(),
  });
}

module.exports = validateRequest;
