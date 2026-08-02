const multer = require('multer')
const cloudinary = require('../config/cloudinary')

const storage = {
    _handleFile(req, file, callback) {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder: file.fieldname === 'clubLogo' ? 'clubRecruitment/clubLogo' : 'clubRecruitment/eventBanner',
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [{ width: 1800, height: 1200, crop: 'limit', quality: 'auto' }],
        }, (error, result) => {
            if (error) return callback(error)
            return callback(null, {
                path: result.secure_url,
                filename: result.public_id,
                size: result.bytes,
                format: result.format,
            })
        })
        file.stream.pipe(uploadStream)
    },
    _removeFile(req, file, callback) {
        if (!file.filename) return callback(null)
        cloudinary.uploader.destroy(file.filename, { resource_type: 'image' })
            .then(() => callback(null))
            .catch(callback)
    },
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 30 },
    fileFilter: (req, file, callback) => {
        const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
        const allowed = allowedMimeTypes.has(file.mimetype)
        callback(allowed ? null : new Error('Only JPG, PNG, and WebP images are allowed'), allowed)
    }
})

module.exports = upload
