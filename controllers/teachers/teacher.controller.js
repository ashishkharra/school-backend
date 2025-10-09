
const teacherService = require('../../services/teachers/teacher.service');
const { responseData } = require('../../helpers/responseData'); // Assume you have this utility for consistent responses

module.exports = {

  getProfile: async (req, res) => {
    try {
      //   const teacherId = req.user._id
      const { teacherId } = req.params
      const profile = await teacherService.getProfile(teacherId);

      return res
        .status(200)
        .json(responseData("TEACHER_PROFILE_FETCHED", profile, req, true));
    } catch (error) {
      return res
        .status(400)
        .json(responseData("FETCH_PROFILE_FAILED", { error: error.message }, req, false));
    }
  },
  requestProfileUpdate: async (req, res) => {
    try {
      const { teacherId } = req.params
      const updateData = req.body;   // e.g. { phone, address }

      const result = await teacherService.requestProfileUpdate(teacherId, updateData);

      return res
        .status(200)
        .json(responseData("PROFILE_UPDATE_REQUEST_SENT", result, req, true));
    } catch (error) {
      return res
        .status(400)
        .json(responseData("PROFILE_UPDATE_REQUEST_FAILED", { error: error.message }, req, false));
    }
  },

}

