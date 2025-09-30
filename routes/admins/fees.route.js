const router = require('express').Router()
const feeController = require('../../controllers/admins/fee.controller.js')
const validationRule = require('../../validations/admins/auth')

// Create Fee Structure
router.post(
    "/structure",
    validationRule.validate("createFeeStructure"),
    feeController.createFeeStructure
)

.post(
    "/student",
    validationRule.validate("assignStudentFee"),
    feeController.assignStudentFee
)


.put(
    "/student/:id",
    validationRule.validate("updateStudentFee"),
    feeController.updateStudentFee
)


.post(
    "/student/:id/payment",
    validationRule.validate("addPayment"),
    feeController.addPayment
)


module.exports = router