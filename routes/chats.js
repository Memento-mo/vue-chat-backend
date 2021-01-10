const firebase = require('firebase')
const db = firebase.firestore()
const users = db.collection('users')
const chats = db.collection('chats')

const randToken = require('rand-token')

const mockAvatar = require('../mocksImages/my.js')
const mockAvatarSecond = require('../mocksImages/img.js')

const { authenticateToken } = require('../utils/auth')

module.exports = app => {
  app.post('/add/message', authenticateToken, async (req, res) => {
    const { message, id_interlocutor } = req.body
    const time = new Date().getTime()

    const userChats = await chats.where('id', '==', req.user.id)
    let userInterlocutor = await users.where('id', '==', id_interlocutor)
    
    await userInterlocutor.get().then(doc => {
      doc.forEach(data => (userInterlocutor = data.data()))
    })

    const interlocutorChats = await chats.where('id', '==', id_interlocutor)

    const promises = []

    function newMessage (chats, { id, first_name, last_name, avatar, my }) {
      return chats.get().then(doc => {
        doc.forEach(data => {
          const { chats } = data.data()
          const chatIndex = chats.findIndex(chat => chat.id === id)

          if (chatIndex === -1) {
            chats.push({ 
              id,
              first_name,
              last_name,
              last_message: {
                text: message,
                time
              },
              avatar,
              messages: [{ message, time, my: my ? true : false, id: randToken.uid(256) }]
            })
          } else {
            chats[chatIndex].last_message = {
              text: message,
              time
            }
            chats[chatIndex].messages.push({ message, time, my: my ? true : false, id: randToken.uid(256) })
          }

          data.ref.update({ chats })
        })
      })
    }
    
    promises.push(newMessage(userChats, { id: id_interlocutor, first_name: userInterlocutor.firstName, last_name: userInterlocutor.lastName, avatar: mockAvatar, my: true}))
    promises.push(newMessage(interlocutorChats, { id: req.user.id, first_name: req.user.firstName, last_name: req.user.lastName, avatar: mockAvatarSecond, my: false }))

    Promise.all(promises)
      .then(() => {
        res.status(201).send()
      })
      .catch(() => {
        res.status(422).send()
      })
  })

  app.get('/messages', authenticateToken, async (req, res) => {
    try {
      const { id } = req.user
  
      const chatUser = await chats.where('id', '==', id)
  
      chatUser.get().then(doc => {
        doc.forEach(data => {
          const chats = data.data()
  
          res.status(200).send(chats)
        })
      })
    } catch (error) {
      res.status(404).send()
    }
  })
}