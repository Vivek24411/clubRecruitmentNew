const http = require('http')
const dotenv = require('dotenv')
dotenv.config()
require('./src/config/validateEnv')()
const app = require('./app')
const connectDB = require('./src/utils/dbConnection')
const { startJobWorker } = require('./src/services/jobQueue.services')

if (require.main === module) {
    connectDB().then(() => {
        const server = http.createServer(app)
        server.listen(process.env.PORT || 3000,()=>{
            console.log(`Server is running on port ${process.env.PORT || 3000}`);
        })
        if (process.env.RUN_JOBS_IN_API !== 'false') startJobWorker()
    }).catch((error) => {
        console.error('Server failed to start:', error)
        process.exitCode = 1
    })
}

module.exports = app
