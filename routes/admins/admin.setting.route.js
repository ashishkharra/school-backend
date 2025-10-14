const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middlewares/verifyToken.js");
const { schoolDoc } = require("../../middlewares/multer.setup.js");
const validationRule = require('../../validations/admins/auth.js')
const { parseMultipartJSONFields } = require('../../helpers/helper.js')
const schoolSettingController = require("../../controllers/admins/admin.setting.controller.js");

const jsonFieldsForSchool = [
  "address",
  "contact",
  "schoolTiming",
  "periods",
  "academicSession"
];


router
  .post(
    "/school-settings",
    [verifyToken, schoolDoc, parseMultipartJSONFields(jsonFieldsForSchool), validationRule.validate('adminSetting')],
    schoolSettingController.saveSettings
  )

  .put(
    "/update-settings",
    [verifyToken, schoolDoc, parseMultipartJSONFields(jsonFieldsForSchool), validationRule.validate('updateAdminSetting')],
    schoolSettingController.updateSettings
  )

  .get(
    "/school-settings",
    [verifyToken],
    schoolSettingController.getSettings
  )

  .patch(
    "/school-settings/reset",
    [verifyToken],
    schoolSettingController.resetSettings
  )

module.exports = router;
