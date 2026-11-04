const { createServer } = require('./app');

const port = Number(process.env.PORT || 3000);
createServer().listen(port, '0.0.0.0', () => {
  console.log(`CI/CD demo listening on port ${port}`);
});
