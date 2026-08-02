const http = require('http')
const dotenv = require('dotenv')
dotenv.config()
require('./src/config/validateEnv')()
const app = require('./app')

if (require.main === module) {
    const server = http.createServer(app)
    server.listen(process.env.PORT || 3000,()=>{
        console.log(`Server is running on port ${process.env.PORT || 3000}`);
    })
}

module.exports = app
