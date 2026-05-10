const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    message: 'Hello there from Treetop!',
    hostname: require('os').hostname(),
  });
});

app.listen(PORT, () => {
  console.log(`Treetop server running on port ${PORT}`);
});
