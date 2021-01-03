const express = require('express')

const bodyParser = require('body-parser')
const cors = require('cors')

const firebase = require("firebase")
const { firebaseConfig } = require('./config')

require("firebase/firestore")
require('dotenv').config()

firebase.initializeApp(firebaseConfig)

const app = express()

if (process.env.NODE_ENV === 'development') {
  app.options('*', cors())
}

app.use(bodyParser.json())

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type, Authorization')
  next()
})

require('./routes/auth.js')(app)

app.listen(9000, () => {
  console.log('The server is running')
})