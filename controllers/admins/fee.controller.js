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
            return res.status(500).json(responseData(result?.message || "FEE_STRUCTURE_CREATION_ERROR", {error : error.message }, req, false));
        }
    },

    assignStudentFee: async (req, res) => {
        try {
            console.log('fee controller ; ', req.body)
            const result = await feeService.assignStudentFee(req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(201).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.log("Assign Student Fee Controller Error:", error);
            return res.status(500).json(responseData(result?.message || "ASSIGN_FEE_ERROR", {error : error.message }, req, false));
        }
    },

    updateStudentFee: async (req, res) => {
        try {
            const studentFeeId = req.params.id;
            const updateData = req.body;

            const result = await feeService.updateStudentFee(studentFeeId, updateData);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            return res.status(200).json(responseData(result.message, result.data, req, true));
        } catch (error) {
            console.error("Update Student Fee Controller Error:", error);
            return res.status(500).json(responseData(result?.message || "UPDATE_FEE_ERROR", {error : error.message }, req, false));
        }
    },

    addPayment: async (req, res) => {
        try {
            const studentFeeId = req.params.id;
            const result = await feeService.addPayment(studentFeeId, req.body);

            if (!result.success) {
                return res.status(400).json(responseData(result.message, {}, req, false));
            }

            console.log('result : ', result)

            return res.status(201).json(responseData(result.message, result, req, true));
        } catch (error) {
            console.log("Add Payment Controller Error:", error.message);
            return res.status(500).json(responseData(result?.message || "ADD_PAYMENT_ERROR", {error : error.message }, req, false));
        }
    },

    getFeeStructureByClass: async (req, res) => {
        try {
            const identifier = req.query.classIdentifier;
            
            const result = await feeService.getFeeStructureByClass(identifier);
            if (!result.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false));
            }

            return res.status(200).json(responseData(result?.message, result?.result, req, result?.success || true));
        } catch (error) {
            console.log('Error while fetching fees structure of class : ', error.message)
            return res.status(200).json(responseData(result?.message || "SERVER_ERROR", {error : error.message }, req, false))
        }
    },

    getAllFeeStructure: async (req, res) => {
        try {
            const result = await feeService.getAllFeeStructure()
            if (!result.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }
            return res.status(200).json(responseData("FEE_STRUCTURE_FETCHED_SUCCESSFULLY", result?.result, req, result?.success || true))
        } catch (error) {
            console.log('Error while fetching fee structures : ', error.message);
            return res.status(500).json(responseData(result?.message || "SERVER_ERROR", {error : error.message}, req, false))
        }
    },

    updateFeeStructure: async (req, res) => {
        try {
            const feeStructureId = req.params.id;
            const updateData = req.body;

            const result = await feeService.updateFeeStructure(feeStructureId, updateData);
            if (!result.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }
            return res.status(200).json(responseData(result?.message, result, req, result?.success || true))
        } catch (error) {
            console.log('Error while updating fee structure : ', error.message);
            return res.status(500).json(responseData(result?.message || "SERVER_ERROR", {error : error.message}, req, false))
        }
    },

    manageStatus: async (req, res) => {
        try {
            const feeStructureId = req.params.id;
            const { status } = req.body;
            console.log('status : ', status)

            const result = await feeService.manageStatus(feeStructureId, status);
            if (!result.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }
            return res.status(200).json(responseData(result?.message, result, req, result?.success || true))
        } catch (error) {
            console.log('Error while updating fee structure status : ', error.message);
            return res.status(500).json(responseData(result?.message || "SERVER_ERROR", {error : error.message}, req, false))
        }
    },

    deleteFeeStructure: async (req, res) => {
        try {
            const feeStructureId = req.params.id;

            const result = await feeService.deleteFeeStructure(feeStructureId);
            if (!result.success) {
                return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            }
            return res.status(200).json(responseData(result?.message, result, req, result?.success || true))
        } catch (error) {
            console.log('Error while deleting fee structure : ', error.message);
            return res.status(500).json(responseData(result?.message || "SERVER_ERROR", {error : error.message}, req, false))
        }
    }


}

module.exports = feeController