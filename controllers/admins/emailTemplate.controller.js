const { responseData } = require('../../helpers/responseData')
const EmailTemplateService = require('../../services/admins/emailTemplate.services')
module.exports = {

  listEmailTemplates: async (req, res) => {
    try {
      await EmailTemplateService.listEmailTemplates(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, { error : error.message }, req))
    }
  },
  editEmailTemplate: async (req, res) => {
    try {
      await EmailTemplateService.editEmailTemplate(req, res)
    } catch (error) {
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, { error : error.message }, req))
    }
  },
  changeStatusEmailTemplate: async (req,res) =>{
    try{
      await EmailTemplateService.changeStatusEmailTemplate(req, res)
    }catch(error){
      const msg = error.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {error : error.message }, req))
    }
  }
}
