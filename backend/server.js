const http = require('http')
const dotenv = require('dotenv')
dotenv.config()
const app = require('./app')
const connectDB = require('./src/utils/dbConnection')


connectDB()

const server = http.createServer(app)


server.listen(process.env.PORT || 3000,()=>{
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
})
