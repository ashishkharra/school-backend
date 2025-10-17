const router = require('express').Router()
const feeController = require('../../controllers/admins/fee.controller.js')
const { verifyToken } = require('../../middlewares/verifyToken.js')
const validationRule = require('../../validations/admins/auth.js')


router.post(
    "/structure",
    [verifyToken],
    validationRule.validate("createFeeStructure"),
    feeController.createFeeStructure
)


    .post(
        "/student",
        [verifyToken],
        validationRule.validate("assignStudentFee"),
        feeController.assignStudentFee
    )

    // .put(
    //     "/student/:id",
    //     [verifyToken],
    //     validationRule.validate("updateStudentFee"),
    //     feeController.updateStudentFee
    // )

    .put(
        "/student/:id/payment",
        [verifyToken],
        validationRule.validate("addPayment"),
        feeController.addPayment
    )

    .get('/get/fee-structure', [verifyToken], feeController.getFeeStructureByClass)
    .get('/get/all/fee-structure', [verifyToken], feeController.getAllFeeStructure)
    .put('/update/fee-structure/:id', [verifyToken], validationRule.validate('updateFeeStruture'), feeController.updateFeeStructure)
    .patch('/toggle/status/fee-structure/:id', [verifyToken], feeController.manageStatus)
    .delete('/delete/fee-structure/:id', [verifyToken], feeController.deleteFeeStructure)


module.exports = router