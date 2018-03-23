module.exports = function (context, input) {
  return new Promise((resolve, reject) => {
    resolve({ messages: ['Some Message', 'Another Message'] })
  })
}
