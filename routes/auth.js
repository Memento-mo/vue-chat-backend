const firebase = require('firebase')

const db = firebase.firestore()
const users = db.collection('users')
const refreshTokens = db.collection('refreshTokens')
const jwt = require('jsonwebtoken')
const randToken = require('rand-token')

const bcrypt = require('bcrypt')
const saltRounds = 10

const { authenticateToken } = require('../utils/auth')

function generateAccessToken(user) {
  return jwt.sign(user, process.env.TOKEN_SECRET, { expiresIn: '100s' })
}

function generateRefreshToken() {
  return randToken.uid(256)
}

function setRefreshToken(token, login) {
  return refreshTokens.doc(token).set({
    login
  })
}

module.exports = app => {
  // app.options('*', (req, res) => {
  //   res.set('Access-Control-Allow-Origin', '*')
  //   res.set("Access-Control-Allow-Headers", "Content-Type")
  // })

  app.post('/token', async (req, res) => {
    const refresh_token = req.body.refresh_token

    try {
      if (!refresh_token || refresh_token === 'undefined') throw Error({ message: 'provided token is invalid' })

      const user = await refreshTokens.doc(refresh_token).get()
        .then(async doc => await users.where('login', '==', doc.data().login))
      
      if (!user || user === 'undefined') throw Error({ message: 'the refresh token is not found' })

      let infoUser

      await user.get().then(doc => {
        doc.forEach(data => infoUser = data.data())
      })

      const token = generateAccessToken({ login: infoUser.login, email: infoUser.email, firstName: infoUser.firstName, lastName: infoUser.lastName })

      await user.get().then(doc => {
        doc.forEach(data => data.ref.update({ token }))
      })

      const refreshToken = generateRefreshToken()

      await refreshTokens.doc(refresh_token).delete()
      await setRefreshToken(refreshToken, infoUser.login)

      res.status(200).send({ token, refreshToken })
    } catch (error) {
      res.status(401).send(error)
    }
  })

  app.post('/registration', async (req, res) => {
    const { login, password, email, firstName, lastName  } = req.body

    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.set('Access-Control-Allow-Headers', 'Content-Type')

    try {
      if (login && password && email) {
        let isEmailExists = false
        let isLoginExist = false

        await users.where('email', '==', email).get()
          .then(query => query.forEach(doc => {
            if (doc.id) {
              isEmailExists = true
            }
          }))

        await users.where('login', '==', login).get()
          .then(query => query.forEach(doc => {
            if (doc.id) {
              isLoginExist = true
            }
          }))
      
        if (isLoginExist || isEmailExists) {
          return res.status(400).send({ message: 'Username or email already exists' })
        }

        const token = generateAccessToken({ login, email, firstName, lastName })
        const refreshToken = generateRefreshToken()
       
        await setRefreshToken(refreshToken, login)

        bcrypt.genSalt(saltRounds, (err, salt) => {
          bcrypt.hash(password, salt, (err, hash) => {
            users.add({
              login,
              hash,
              email,
              firstName,
              lastName,
              token
            })
            .then(() => {
              res.status(201).send({ token, refreshToken })
            })
          })
        })

      }  
    } catch (error) {
      res.status(500).send()
    }
  })

  app.post('/login', async (req, res) => {
    const { login, password } = req.body

    try {
      await users.where('login', '==', login).get()
        .then(query => query.forEach(doc => {
          const user = doc.data()

          bcrypt.compare(password, user.hash, (err, result) => {
            if (result) {
              return refreshTokens.where('login', '==', user.login).get()
                .then(query => query.forEach(async (doc) => {
                  if (doc.id) {
                    return res.status(200).send({ token: user.token, refreshToken: doc.id })
                  }

                  const refreshToken = generateRefreshToken()
 
                  await setRefreshToken(refreshToken, user.login)
                }))
            }

            res.status(422).send({ message: 'Password is invalid' })
          })
        }))
    } catch (error) {
      res.status(500).send()
    }
  })
}