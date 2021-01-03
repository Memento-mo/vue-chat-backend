const jwt = require('jsonwebtoken')

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']

  if (token === null) return res.sendStatus(401)

  jwt.verify(token, process.env.TOKEN_SECRET, (error, user) => {

    if (error) return res.status(403).send({ error })
    
    req.user = user
    next()
  })
}

module.exports = {
  authenticateToken
}