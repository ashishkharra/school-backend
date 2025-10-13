
const teacherService = require('../../services/teachers/teacher.service');
const { responseData } = require('../../helpers/responseData'); // Assume you have this utility for consistent responses

module.exports = {

  getProfile: async (req, res) => {
    try {
        const teacherId = req.user._id
      const profile = await teacherService.getProfile(teacherId);

      return res
        .status(200)
        .json(responseData(profile?.message, profile, req, profile?.success||true));
    } catch (error) {
      return res
        .status(400)
        .json(responseData("FETCH_PROFILE_FAILED", { error: error.message }, req, false));
    }
  },
  requestProfileUpdate: async (req, res) => {
    try {
      const { teacherId } = req.params;
      const requestedFields = req.body.requestedFields; // nested object with updates

      if (!requestedFields || Object.keys(requestedFields).length === 0) {
        return res
          .status(400)
          .json(responseData('REQUESTED_FIELDS_EMPTY', {}, req, false));
      }

      const result = await teacherService.requestProfileUpdate(teacherId, requestedFields);

      if (!result.success) {
        return res
          .status(400)
          .json(responseData(result.message, {}, req, false));
      }

      return res
        .status(200)
        .json(
          responseData(
            result.message,
            {
              teacherId,
              requestedFields // return full data
            },
            req,
            true
          )
        );
    } catch (error) {
      console.error('Error in requestProfileUpdate controller:', error);
      return res
        .status(500)
        .json(responseData('SERVER_ERROR', { error: error.message }, req, false));
    }
  },
  teacherForgotPassword: async (req, res) => {
        try {
            await teacherService.teacherForgotPassword(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
 
    teacherResetPassword: async (req, res) => {
        try {
            await teacherService.teacherResetPassword(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },
 
    changePassword: async (req, res) => {
        try {
            await teacherService.changePassword(req, res)
        } catch (err) {
            const msg = err.message || 'SOMETHING_WENT_WRONG'
            return res.status(422).json(responseData(msg, {}, req))
        }
    },

    getAttendance: async (req, res) => {
        try {
            const { month, year } = req.query;
            const teacherId = req.user._id;

            if (!month || !year) {
                return res.status(400).json(responseData("MONTH_YEAR_REQUIRED", {}, req, false));
            }

            const attendance = await teacherService.getAttendance(teacherId, parseInt(month), parseInt(year));

            return res.status(200).json(responseData("ATTENDANCE_FETCHED", attendance, req, true));
        } catch (err) {
            console.error("Error:", err.message);
            return res.status(500).json(responseData("ERROR_OCCUR", {error : err.message}, req, false));
        }
    }
}

