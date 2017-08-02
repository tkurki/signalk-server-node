module.exports = function (app) {
  var strategy = {}

  app.post('*', function (req, res, next) {
    next(new Error('Not allowed'))
  })

  app.use('/restart', function (req, res, next) {
    next(new Error('Not allowed'))
  })

  strategy.shouldAllowWrite = function (req) {
    throw new Error('Not allowed')
  }

  strategy.authorizeWS = function (req) {}

  strategy.verifyWS = function (req) {}

  return strategy
}
