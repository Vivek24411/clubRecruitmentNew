const multer = require('multer')
const {CloudinaryStorage} = require('multer-storage-cloudinary')
const cloudinary = require('../config/cloudinary')


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'clubRecruitment/eventBanner',
        resource_type: 'auto', // allow images and pdf/raw
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
        // Note: transformations apply to images only; PDFs will ignore them
        // transformation: [{width: 500, height:500, crop:"limit"}]
    }
})

const upload = multer({ storage: storage })

module.exports = upload