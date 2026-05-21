const express = require('express')
const app = express()

app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Interview Prep API running' })
})

app.listen(3001, () => {
  console.log('Server running on http://localhost:3001')
})