const firebase = require('firebase')
const db = firebase.firestore()
const users = db.collection('users')

const { authenticateToken } = require('../utils/auth')

module.exports = app => {
  app.get('/profile', authenticateToken, async (req, res) => {
    try {
      const user = await users.where('id', '==', req.user.id)
  
      await user.get().then(doc => {
        doc.forEach(data => {
          const { lastName: last_name, firstName: first_name, avatar, email, id } = data.data()
          res.status(200).send({
            last_name,
            first_name,
            avatar,
            email,
            id
          })
        })
      })
    } catch (error) {
      res.status(404).send()
    }
  })
}