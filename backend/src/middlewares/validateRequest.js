const { validationResult } = require("express-validator");
const { destroyUploadedFile } = require("../utils/uploads");

async function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const uploads = [req.file, ...(req.files || []), ...(req.directUploadFiles || [])].filter(Boolean);
  await Promise.all([...new Map(uploads.map((file) => [file.filename, file])).values()].map(destroyUploadedFile));

  return res.status(400).json({
    success: false,
    msg: "Please correct the highlighted fields",
    errors: errors.array(),
  });
}

module.exports = validateRequest;
