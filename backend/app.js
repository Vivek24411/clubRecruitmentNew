const express = require('express')
const studentRouter = require('./src/routes/student.routes')
const adminRouter = require('./src/routes/admin.routes')
const clubRouter = require('./src/routes/club.routes')
const app = express()
const cors = require('cors')


app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use('/student',studentRouter)
app.use('/admin',adminRouter)
app.use('/club',clubRouter)


module.exports = app