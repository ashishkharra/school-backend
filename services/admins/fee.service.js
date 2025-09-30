const FeeStructure = require('../../models/fees/feeStructure.schema.js')
const StudentFee = require('../../models/fees/studentFee.schema.js')


module.exports = {

    createFeeStructure: async (data) => {
        try {
            const { classIdentifier } = data;

            let existingFee = await FeeStructure.findOne({ classIdentifier });
            if (existingFee) {
                return {
                    success: false,
                    message: "FEE_STRUCTURE_ALREADY_EXISTS",
                    data: existingFee
                };
            }

            const feeStructure = new FeeStructure(data);
            const result = await feeStructure.save();

            if (!result) {
                return {
                    success: false,
                    message: "FEE_STRUCTURE_CREATION_FAILED"
                };
            }

            return {
                success: true,
                message: "FEE_STRUCTURE_CREATED",
                data: result
            };
        } catch (error) {
            console.log("Fee Structure Service Error:", error.message);
            return {
                success: false,
                message: "FEE_STRUCTURE_CREATION_ERROR"
            };
        }
    },

    assignStudentFee: async (data) => {
        try {
            const studentFee = new StudentFee({
                studentId: data.studentId,
                feeStructureId: data.feeStructureId,
                appliedFeeHeads: data.appliedFeeHeads,
                discounts: data.discounts || 0,
                payableAmount: data.payableAmount,
                paidTillNow: 0,
                status: "Pending",
            });

            const result = await studentFee.save();
            if (!result) return { success: false, message: "ASSIGN_FEE_FAILED" };

            // Fetch with populated details using lookup
            const populated = await StudentFee.aggregate(studentFeeWithDetails(result._id));

            return { success: true, message: "FEE_ASSIGNED_SUCCESSFULLY", data: populated[0] };
        } catch (error) {
            console.log("Assign Student Fee Service Error:", error.message);
            return { success: false, message: "ASSIGN_FEE_FAILED" };
        }
    },


    updateStudentFee: async (studentFeeId, data) => {
        try {
            const studentFee = await StudentFee.findById(studentFeeId);
            if (!studentFee) return { success: false, message: "STUDENT_FEE_NOT_FOUND" };

            if (data.appliedFeeHeads) studentFee.appliedFeeHeads = data.appliedFeeHeads;
            if (data.discounts !== undefined) studentFee.discounts = data.discounts;
            if (data.payableAmount !== undefined) studentFee.payableAmount = data.payableAmount;

            const result = await studentFee.save();

            // Fetch updated data with lookup
            const populated = await StudentFee.aggregate(studentFeeWithDetails(result._id));

            return { success: true, message: "STUDENT_FEE_UPDATED", data: populated[0] };
        } catch (error) {
            console.log("Update Student Fee Service Error:", error.message);
            return { success: false, message: "UPDATE_FEE_ERROR" };
        }
    },


    addPayment: async (studentFeeId, paymentData) => {
        try {
            // Fetch full student fee with details
            const resultArray = await StudentFee.aggregate(studentFeeWithDetails(studentFeeId));
            const studentFee = resultArray[0];

            if (!studentFee) return { success: false, message: "STUDENT_FEE_NOT_FOUND" };

            const updatedPaid = studentFee.paidTillNow + paymentData.amountPaid;
            const status = updatedPaid >= studentFee.payableAmount ? "Paid" : "Partial";


            const updatedStudentFee = await StudentFee.findByIdAndUpdate(
                studentFeeId,
                {
                    $inc: { paidTillNow: paymentData.amountPaid },
                    $set: { status },
                    $push: {
                        payments: {
                            transactionId: paymentData.transactionId,
                            amountPaid: paymentData.amountPaid,
                            mode: paymentData.mode,
                            status: paymentData.status || "Success",
                            remarks: paymentData.remarks || "",
                            date: new Date(),
                        },
                    },
                },
                { new: true }
            );

            const populated = await StudentFee.aggregate(studentFeeWithDetails(studentFeeId));

            return { success: true, message: "PAYMENT_ADDED_SUCCESSFULLY", data: populated[0] };
        } catch (error) {
            console.log("Add Payment Service Error:", error.message);
            return { success: false, message: "ADD_PAYMENT_ERROR" };
        }
    },

    getAllFeesForStudent: async (studentId) => {
        try {
            const fees = await StudentFee.aggregate(allStudentFeesForStudent(studentId));
            return { success: true, message: "STUDENT_FEES_FETCHED", data: fees };
        } catch (error) {
            console.log("Get All Student Fees Service Error:", error.message);
            return { success: false, message: 'STUDENT_FEE_NOT_FOUND' };
        }
    },
};
