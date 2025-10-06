const _ = require('multi-lang')('lang.json')
const jwt = require('jsonwebtoken')

module.exports = {
  responseData: (message, result, req, success) => {
    const language = req.headers['language'] ? req.headers['language'] : 'en'
    let response = {}
    response.success = success
    response.message =
      _(message, language) || _('SOMETHING_WENT_WRONG', language) || result.message
    response.results = result
    return response
  },
  setMessage: (message, language) => {
    return __(message, language)
  },
  generateAuthToken: (user) => {
    console.log('user-------------', user)
    const token = jwt.sign(user, process.env.JWT_SECRET, {
      expiresIn: process.env.TOKEN_LIFE || "15m"
    });
    const refresh_token = jwt.sign(user, process.env.JWT_SECRET_REFRESH, {
      expiresIn: process.env.REFRESH_TOKEN_LIFE || "7d"
    });
    const allData = {...user, token, refresh_token}
    return allData;
  },
  generateUniqueUserId: () => {
    const randomUserId = Math.floor(Math.random() * 1000000)
    return randomUserId.toString()
  },
  handleSocialIdExist: (req, res) => {
    return res.json(responseData('SOCIAL_ID_EXIST', {}, req, false))
  }
}


