const { responseData } = require('../../helpers/responseData')
const adminService = require('../../services/admins/admin.services')
module.exports = {
  registerAdmin: async (req, res) => {
    try {
      const result = await adminService.registerAdmin(req.body);
      return res.status(201).json(responseData("ADMIN_REGISTERED", result, req, true));
    } catch (error) {
      console.error("Error registering admin:", error.message);
      return res.status(400).json(responseData("REGISTRATION_FAILED", { error: error.message }, req, false));
    }
  },
  adminLogin: async (req, res) => {
    try {
      await adminService.adminLogin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminProfile: async (req, res) => {
    try {
      await adminService.adminProfile(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminForgotPassword: async (req, res) => {
    try {
      await adminService.adminForgotPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  adminResetPassword: async (req, res) => {
    try {
      await adminService.adminResetPassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changePassword: async (req, res) => {
    try {
      await adminService.changePassword(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  editAdmin: async (req, res) => {
    try {
      await adminService.editAdmin(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  changeStatus: async (req, res) => {
    try {
      await adminService.changeStatus(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  generatePresignedURL: async (req, res) => {
    try {
      await adminService.generatePresignedURL(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  },
  countryList: async (req, res) => {
    try {
      await adminService.countryList(req, res)
    } catch (err) {
      const msg = err.message || 'SOMETHING_WENT_WRONG'
      return res.status(422).json(responseData(msg, {}, req))
    }
  }
}
