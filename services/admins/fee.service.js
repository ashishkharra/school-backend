const mongoose = require('mongoose')

const FeeStructure = require('../../models/fees/feeStructure.schema.js')
const StudentFee = require('../../models/fees/studentFee.schema.js')
const SchoolSetting = require('../../models/admin/admin.setting.schema.js')
const { getStudentWithDetails, getAllFeesStructurePipeline } = require('../../helpers/commonAggregationPipeline.js')

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

            const setting = await SchoolSetting.findOne();

            data.academicYear = setting.academicSession.currentSession
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
            const { appliedFeeHeads = [], studentId, feeStructureId, discounts = 0, payments = [] } = data;

            console.log('Assigning fee to student:', studentId, 'with data:', data);

            if (!studentId || !feeStructureId) {
                return { success: false, message: "STUDENT_ID_AND_FEE_STRUCTURE_ID_REQUIRED" };
            }

            const existingFee = await StudentFee.findOne({ studentId, feeStructureId });

            if (existingFee) {
                return { success: false, message: "FEE_ALREADY_ASSIGNED" };
            }

            const updatedHeads = appliedFeeHeads.map(head => ({
                ...head,
                paidTillNow: head.paidTillNow || 0
            }));

            const totalFee = appliedFeeHeads.reduce((sum, head) => sum + head.amount, 0);
            const paidTillNow = updatedHeads.reduce((sum, head) => sum + head.paidTillNow, 0);
            const payableAmount = totalFee - discounts;
            const remaining = payableAmount - paidTillNow;

            let status = "Pending";
            if (paidTillNow >= payableAmount) status = "Paid";
            else if (paidTillNow > 0) status = "Partial";

            const studentFee = new StudentFee({
                studentId,
                feeStructureId,
                appliedFeeHeads: updatedHeads,
                totalFee,
                discounts,
                payableAmount,
                paidTillNow,
                remaining,
                status,
                payments,
            });

            const result = await studentFee.save();
            if (!result) return { success: false, message: "ASSIGN_FEE_FAILED" };

            const populated = await StudentFee.aggregate(getStudentWithDetails(result.studentId));

            const student = populated

            const feeHeadsHtml = updatedHeads
                .map(head => `<p>${head.name}: ${head.amount}</p>`)
                .join('');

            const emailData = {
                PARENT_NAME: student.parents?.[0]?.name || "Parent",
                STUDENT_NAME: student.name,
                CLASS: student.class?.name || "",
                ACADEMIC_YEAR: result.academicYear || "",
                FEE_HEADS: feeHeadsHtml,
                TOTAL_FEE: totalFee,
                DISCOUNTS: discounts,
                PAYABLE_AMOUNT: payableAmount,
                DUE_DATE: result.dueDate?.toLocaleDateString() || "",
                SCHOOL_NAME: process.env.SCHOOL_NAME || "Your School",
                email: student.parents?.[0]?.email || student.email, // recipient
            };

            const emailSent = await sendEmail("student-fee-assignment", emailData);
            if (!emailSent) console.warn("⚠️ Fee assignment email failed to send");

            return { success: true, message: "FEE_ASSIGNED_SUCCESSFULLY", data: populated[0] };
        } catch (error) {
            console.log("Assign Student Fee Service Error:", error.message);
            return { success: false, message: "ASSIGN_FEE_FAILED" };
        }
    },

    updateStudentFee: async (studentFeeId, data) => {
        try {
            const studentFee = await StudentFee.findById(studentFeeId);
            if (!studentFee) {
                return { success: false, message: "STUDENT_FEE_NOT_FOUND" };
            }

            if (data.appliedFeeHeads) {
                studentFee.appliedFeeHeads = data.appliedFeeHeads.map(head => ({
                    type: head.type,
                    amount: head.amount,
                    paidTillNow: head.paidTillNow || 0
                }));

                const totalFee = studentFee.appliedFeeHeads.reduce((sum, head) => sum + head.amount, 0);
                const paidTillNow = studentFee.appliedFeeHeads.reduce((sum, head) => sum + head.paidTillNow, 0);

                studentFee.totalFee = totalFee;
                studentFee.payableAmount = totalFee - (studentFee.discounts || 0);
                studentFee.paidTillNow = paidTillNow;
                studentFee.remaining = studentFee.payableAmount - paidTillNow;

                studentFee.status = studentFee.paidTillNow >= studentFee.payableAmount
                    ? "Paid"
                    : studentFee.paidTillNow > 0
                        ? "Partial"
                        : "Pending";
            }

            if (data.discounts !== undefined) {
                studentFee.discounts = data.discounts;
                studentFee.payableAmount = studentFee.totalFee - data.discounts;
                studentFee.remaining = studentFee.payableAmount - (studentFee.paidTillNow || 0);
            }

            if (data.paidTillNow !== undefined) {
                studentFee.paidTillNow = data.paidTillNow;
                studentFee.remaining = studentFee.payableAmount - data.paidTillNow;

                studentFee.status =
                    studentFee.paidTillNow >= studentFee.payableAmount
                        ? "Paid"
                        : studentFee.paidTillNow > 0
                            ? "Partial"
                            : "Pending";
            }
            const result = await studentFee.save();
            const [populated] = await StudentFee.aggregate(getStudentWithDetails(result._id));
            const student = populated.student;
            const feeHeadsHtml = studentFee.appliedFeeHeads
                .map(head => `<p>${head.type}: ${head.amount} (Paid: ${head.paidTillNow})</p>`)
                .join('');

            const emailData = {
                PARENT_NAME: student.parents?.[0]?.name || "Parent",
                STUDENT_NAME: student.name,
                CLASS: student.class?.name || "",
                ACADEMIC_YEAR: studentFee.academicYear || "",
                FEE_HEADS: feeHeadsHtml,
                TOTAL_FEE: studentFee.totalFee,
                DISCOUNTS: studentFee.discounts || 0,
                PAYABLE_AMOUNT: studentFee.payableAmount,
                DUE_DATE: studentFee.dueDate?.toLocaleDateString() || "",
                SCHOOL_NAME: process.env.SCHOOL_NAME || "Your School",
                email: student.parents?.[0]?.email || student.email,
            };

            const emailSent = await sendEmail("student-fee-assignment", emailData);
            if (!emailSent) console.warn("⚠️ Fee update email failed to send");

            return { success: true, message: "STUDENT_FEE_UPDATED", data: populated };
        } catch (error) {
            console.error("Update Student Fee Service Error:", error);
            return { success: false, message: "UPDATE_FEE_FAILED" };
        }
    },

    addPayment: async (studentFeeId, paymentData) => {
        try {
            const resultArray = await StudentFee.aggregate(getStudentWithDetails(studentFeeId));
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

            const populated = await StudentFee.aggregate(getStudentWithDetails(studentFeeId));

            const student = populated[0].student;
            const emailData = {
                PARENT_NAME: student.parents?.[0]?.name || "Parent",
                STUDENT_NAME: student.name,
                CLASS: student.class?.name || "",
                ACADEMIC_YEAR: studentFee.academicYear || "",
                AMOUNT_PAID: paymentData.amountPaid,
                PAYABLE_AMOUNT: studentFee.payableAmount,
                PAID_TILL_NOW: updatedPaid,
                REMAINING: studentFee.payableAmount - updatedPaid,
                STATUS: status,
                TRANSACTION_ID: paymentData.transactionId,
                PAYMENT_MODE: paymentData.mode,
                PAYMENT_DATE: new Date().toLocaleDateString(),
                SCHOOL_NAME: process.env.SCHOOL_NAME || "Your School",
                email: student.parents?.[0]?.email || student.email,
            };

            const emailSent = await sendEmail("student-payment-notification", emailData);
            if (!emailSent) console.warn("Payment email failed to send");

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

    getFeeStructureByClass: async (identifier) => {
        try {
            if (!identifier) {
                return { success: false, message: "CLASS_IDENTIFIER_REQUIRED" }
            }

            const result = await FeeStructure.findOne({ classIdentifier: identifier });
            if (!result) {
                return { success: false, message: "FEE_STRUCTURE_NOT_FOUND" }
            }
            return { success: true, message: "FEE_STRUCTURE_FETCHED_SUCCESSFULLY", result }
        } catch (error) {
            console.log('Error while fetching fees structure : ', error.message);
            return { success: false, message: 'SERVER_ERROR' }
        }
    },

    getAllFeeStructure: async () => {
        try {
            const result = await FeeStructure.aggregate(getAllFeesStructurePipeline());
            if (!result) {
                return { success: false, message: "FEE_STRUCTURE_NOT_FOUND" }
            }
            return { success: true, message: "FEE_STRUCTURE_FETCHED_SUCCESSFULLY", result }
        } catch (error) {
            console.log('Error while fetching fee structures : ', error.message);
            return { success: false, message: 'SERVER_ERROR' }
        }
    },

    updateFeeStructure: async (feeStructureId, data) => {
        try {
            console.log('Updating fee structure ID:', feeStructureId, 'with data:', data);

            if (!mongoose.Types.ObjectId.isValid(feeStructureId)) {
                return { success: false, message: "INVALID_FEE_STRUCTURE_ID" };
            }

            const feeStructure = await FeeStructure.findById(feeStructureId);
            if (!feeStructure) {
                return { success: false, message: "FEE_STRUCTURE_NOT_FOUND" };
            }

            if (data.feeHeads && Array.isArray(data.feeHeads)) {
                feeStructure.feeHeads = data.feeHeads.map(head => ({
                    type: head.type,
                    amount: Number(head.amount) || 0,
                    isOptional: head.isOptional || false
                }));

                feeStructure.totalAmount = feeStructure.feeHeads.reduce(
                    (sum, head) => sum + head.amount,
                    0
                );
            }

            if (data.classIdentifier) feeStructure.classIdentifier = data.classIdentifier;
            if (data.dueDate) feeStructure.dueDate = data.dueDate;
            if (data.description) feeStructure.description = data.description;
            if (data.academicYear) feeStructure.academicYear = data.academicYear;

            if (data.totalAmount && (!data.feeHeads || data.feeHeads.length === 0)) {
                feeStructure.totalAmount = Number(data.totalAmount);
            }

            const result = await feeStructure.save();
            if (!result) {
                return { success: false, message: "FEE_STRUCTURE_UPDATE_FAILED" };
            }

            return { success: true, message: "FEE_STRUCTURE_UPDATED", data: result };

        } catch (error) {
            console.error("Update Fee Structure Service Error:", error);
            return { success: false, message: "FEE_STRUCTURE_UPDATE_ERROR" };
        }
    },

    manageStatus: async (feeStructureId, status) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(feeStructureId)) {
                return { success: false, message: "INVALID_FEE_STRUCTURE_ID" };
            }
            const feeStructure = await FeeStructure.findById(feeStructureId);
            if (!feeStructure) {
                return { success: false, message: "FEE_STRUCTURE_NOT_FOUND" };
            }

            status ? feeStructure.status = "active" : feeStructure.status = "inactive";

            const result = await feeStructure.save();
            if (!result) {
                return { success: false, message: "FEE_STRUCTURE_STATUS_UPDATE_FAILED" };
            }

            return { success: true, message: `FEE_STRUCTURE_${result.status}`, data: result };
        } catch (error) {
            console.error("Manage Fee Structure Status Service Error:", error);
            return { success: false, message: "FEE_STRUCTURE_STATUS_UPDATE_ERROR" };
        }
    },

    deleteFeeStructure: async (feeStructureId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(feeStructureId)) {
                return { success: false, message: "INVALID_FEE_STRUCTURE_ID" };
            }
            const feeStructure = await FeeStructure.findById(feeStructureId);
            if (!feeStructure) {
                return { success: false, message: "FEE_STRUCTURE_NOT_FOUND" };
            }

            const result = await FeeStructure.findByIdAndDelete(feeStructureId);
            if (!result) {
                return { success: false, message: "FEE_STRUCTURE_DELETION_FAILED" };
            }

            return { success: true, message: "FEE_STRUCTURE_DELETED_SUCCESSFULLY", data: result };
        } catch (error) {
            console.error("Delete Fee Structure Service Error:", error);
            return { success: false, message: "FEE_STRUCTURE_DELETION_ERROR" };
        }
    }

};
