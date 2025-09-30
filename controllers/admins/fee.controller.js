const { responseData } = require('../../helpers/responseData.js')
const feeService = require('../../services/admins/fee.service.js')

const feeController = {

    createFeeStructure: async (req, res) => {
        try {
            const result = await feeService.createFeeStructure(req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(201).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.log("Create Fee Structure Controller Error:", error.message);
            return res.status(500).json(responseData("FEE_STRUCTURE_CREATION_ERROR", {}, req, false));
        }
    },

    assignStudentFee: async (req, res) => {
        try {
            const result = await feeService.assignStudentFee(req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(201).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.log("Assign Student Fee Controller Error:", error.message);
            return res.status(500).json(responseData("ASSIGN_FEE_ERROR", {}, req, false));
        }
    },

    updateStudentFee: async (req, res) => {
        try {
            const studentFeeId = req.params.id;
            const result = await feeService.updateStudentFee(studentFeeId, req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.log("Update Student Fee Controller Error:", error.message);
            return res.status(500).json(responseData("UPDATE_FEE_ERROR", {}, req, false));
        }
    },

    addPayment: async (req, res) => {
        try {
            const studentFeeId = req.params.id;
            const result = await feeService.addPayment(studentFeeId, req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(201).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.log("Add Payment Controller Error:", error.message);
            return res.status(500).json(responseData("ADD_PAYMENT_ERROR", {}, req, false));
        }
    },


}

module.exports = feeController