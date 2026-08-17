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
        const port = Number(process.env.PORT) || 3000
        server.listen(port, '0.0.0.0',()=>{
            console.log(`Server is running on 0.0.0.0:${port}`);
        })
        if (process.env.RUN_JOBS_IN_API !== 'false') startJobWorker()
    }).catch((error) => {
        console.error('Server failed to start:', error)
        process.exitCode = 1
    })
}

module.exports = app
