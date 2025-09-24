const bcrypt = require('bcrypt');
const mongoose = require('mongoose')

const { generateOTP } = require('../../helpers/helper.js')

const Student = require("../../models/students/student.schema.js");
const Class = require("../../models/class/class.schema.js");
const Attendance = require('../../models/students/attendance.schema.js')
// const Fees = require('../../models/fees')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Enrollment = require('../../models/students/studentEnrollment.schema.js');

const { getClassWithStudentsPipeline, getStudentDetailsPipeline } = require('../../helpers/commonAggregationPipeline.js')


const adminStudent = {
    addStudent: async (studentData) => {
        try {
            const {
                name,
                dob,
                gender,
                bloodGroup,
                email,
                password,
                phone,
                address,
                parents,
                guardian,
                emergencyContact,
                classId,
                academicYear,
                physicalDisability,
                disabilityDetails
            } = studentData;

            // 1. Check for duplicates
            const existingStudent = await Student.findOne({ $or: [{ email }, { phone }] });
            if (existingStudent) {
                return { success: false, message: "STUDENT_ALREADY_EXISTS" };
            }

            // 2. Find class
            const classObj = await Class.findById(classId);
            if (!classObj) {
                return { success: false, message: "CLASS_NOT_FOUND" };
            }

            // 3. Hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // 4. Assign section automatically (A–D balance)
            const sectionCounts = { A: 0, B: 0, C: 0, D: 0 };
            const enrollments = await Enrollment.find({ class: classId, academicYear });

            enrollments.forEach((e) => {
                if (sectionCounts[e.section] !== undefined) sectionCounts[e.section]++;
            });

            const assignedSection = Object.keys(sectionCounts).reduce((a, b) =>
                sectionCounts[a] <= sectionCounts[b] ? a : b
            );

            // 5. Generate roll number & admission number
            const serial = sectionCounts[assignedSection] + 1;
            const classNumber = classObj.name.replace(/\D/g, "");
            const rollNo = `${classNumber}${assignedSection}-${String(serial).padStart(3, "0")}`;

            const admissionNo = "ADM-" + Date.now().toString().slice(-6); // simple unique admission no.

            // 6. Create student
            const student = await Student.create({
                admissionNo,
                admissionDate: new Date(),
                name,
                dob,
                gender,
                bloodGroup,
                email,
                password: hashedPassword,
                phone: phone || null,
                address,
                parents,
                guardian,
                emergencyContact,
                class: classObj.name,
                section: assignedSection,
                academicYear,
                rollNo,
                physicalDisability: physicalDisability || false,
                disabilityDetails: disabilityDetails || null,
            });

            // 7. Create enrollment record
            await Enrollment.create({
                student: student._id,
                class: classId,
                academicYear,
                section: assignedSection,
                rollNo
            });

            // 8. Update class student count
            classObj.studentCount += 1;
            await classObj.save();

            return {
                success: true,
                message: "STUDENT_REGISTERED_SUCCESSFULLY",
                data: {
                    studentId: student._id,
                    admissionNo,
                    rollNo,
                    section: assignedSection,
                    class: classObj.name
                }
            };

        } catch (error) {
            console.error("Student register error:", error.message);
            return { success: false, message: "REGISTRATION_FAILED" };
        }
    },

    updateStudent: async (studentData, studentId) => {
        try {
            const {
                name,
                email,
                phone,
                address,
                parents,
                guardian,
                emergencyContact,
                dob,
                gender,
                bloodGroup,
                profilePic,
                password,
                section,
                academicYear,
                physicalDisability,
                disabilityDetails
            } = studentData;

            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }

            // 1. Find existing student
            const student = await Student.findById(studentId);
            if (!student) {
                return { success: false, message: "STUDENT_NOT_FOUND" };
            }

            // 2. Prepare update object
            const updateData = {};
            if (name) updateData.name = name;
            if (email) updateData.email = email;
            if (phone) updateData.phone = phone;
            if (address) updateData.address = address;
            if (parents) updateData.parents = parents;
            if (guardian) updateData.guardian = guardian;
            if (emergencyContact) updateData.emergencyContact = emergencyContact;
            if (dob) updateData.dob = dob;
            if (gender) updateData.gender = gender;
            if (bloodGroup) updateData.bloodGroup = bloodGroup;
            if (profilePic) updateData.profilePic = profilePic;
            if (typeof physicalDisability !== "undefined") {
                updateData.physicalDisability = physicalDisability;
                updateData.disabilityDetails = disabilityDetails || null;
            }

            if (password) {
                updateData.password = await bcrypt.hash(password, 12);
            }

            // 3. Update enrollment (section or academic year changes)
            if (section || academicYear) {
                const enrollment = await Enrollment.findOne({ student: studentId });
                if (!enrollment) {
                    return { success: false, message: "ENROLLMENT_NOT_FOUND" };
                }

                let newSection = section || enrollment.section;
                let newYear = academicYear || enrollment.academicYear;

                enrollment.section = newSection;
                enrollment.academicYear = newYear;

                // Re-generate rollNo if section or year is changed
                if (section || academicYear) {
                    const classObj = await Class.findById(enrollment.class);
                    if (!classObj) {
                        return { success: false, message: "CLASS_NOT_FOUND" };
                    }

                    const sectionCount = await Enrollment.countDocuments({
                        class: enrollment.class,
                        section: newSection,
                        academicYear: newYear
                    });

                    const serial = sectionCount + 1;
                    const className = classObj.name.replace(/\D/g, "");
                    const newRollNo = `${className}${newSection}-${String(serial).padStart(3, "0")}`;

                    enrollment.rollNo = newRollNo;
                    updateData.rollNo = newRollNo;
                    updateData.section = newSection;
                    updateData.academicYear = newYear;
                }

                await enrollment.save();
            }

            // 4. Update student
            const updatedStudent = await Student.findByIdAndUpdate(studentId, updateData, {
                new: true
            });

            return {
                success: true,
                student: updatedStudent,
                message: "STUDENT_UPDATED_SUCCESSFULLY"
            };

        } catch (error) {
            console.error("UpdateStudent error:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    updateStudentClass: async (studentId, classId, section = null, academicYear = new Date().getFullYear()) => {
        try {
            // 1. Find student
            const student = await Student.findById(studentId);
            if (!student) {
                return { success: false, message: "STUDENT_NOT_FOUND" };
            }

            // 2. Find class
            const classObj = await Class.findById(classId);
            if (!classObj) {
                return { success: false, message: "CLASS_NOT_FOUND" };
            }

            // 3. Find enrollment
            const enrollment = await Enrollment.findOne({ student: studentId });
            if (!enrollment) {
                return { success: false, message: "ENROLLMENT_NOT_FOUND" };
            }

            // 4. If section not provided → auto balance
            if (!section) {
                const sectionCounts = { A: 0, B: 0, C: 0, D: 0 };
                const enrollments = await Enrollment.find({ class: classId, academicYear });

                enrollments.forEach((e) => {
                    if (sectionCounts[e.section] !== undefined) sectionCounts[e.section]++;
                });

                section = Object.keys(sectionCounts).reduce((a, b) =>
                    sectionCounts[a] <= sectionCounts[b] ? a : b
                );
            }

            // 5. Count students already in the new section
            const sectionCount = await Enrollment.countDocuments({
                class: classId,
                section,
                academicYear
            });

            const serial = sectionCount + 1;

            // 6. Format class name safely
            const classNumber = classObj.name.match(/\d+/)?.[0] || classObj.name;
            const newRollNo = `${classNumber}${section}-${String(serial).padStart(3, "0")}`;

            // 7. Update enrollment
            enrollment.class = classId;
            enrollment.section = section;
            enrollment.academicYear = academicYear;
            enrollment.rollNo = newRollNo;
            await enrollment.save();

            // 8. Update student rollNo + section + academicYear
            student.rollNo = newRollNo;
            student.section = section;
            student.academicYear = academicYear;
            await student.save();

            // 9. Update class studentCount
            classObj.studentCount = await Enrollment.countDocuments({ class: classId, academicYear });
            await classObj.save();

            return { success: true, student, enrollment, message: "STUDENT_CLASS_UPDATED" };
        } catch (error) {
            console.error("UpdateStudentClass error:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    deleteStudent: async (studentId, adminId, reason = "No reason provided") => {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }
            // 1. Find student
            const student = await Student.findById(studentId);
            if (!student) {
                return { success: false, message: "STUDENT_NOT_FOUND" };
            }

            // 2. Check if already removed
            if (student.isRemoved === 1) {
                return { success: false, message: "STUDENT_ALREADY_REMOVED" };
            }

            // 3. Soft delete student
            student.status = "inactive";
            student.isRemoved = 1;
            student.removedAt = new Date();
            student.removedReason = reason;
            student.removedBy = adminId;

            await student.save();

            // 4. Soft delete enrollments
            await Enrollment.updateMany(
                { student: studentId },
                { $set: { status: "inactive" } }
            );

            // 5. Return response
            return {
                success: true,
                message: "STUDENT_SOFT_DELETED",
                student: {
                    id: student._id,
                    name: student.name,
                    email: student.email,
                    status: student.status,
                    isRemoved: student.isRemoved,
                    removedAt: student.removedAt,
                    removedReason: student.removedReason,
                    removedBy: student.removedBy
                }
            };
        } catch (error) {
            console.error("deleteStudent error:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    // Get All Students
    getStudentAccordingClass: async (classId, filters = {}, page = 1, limit = 10) => {
        try {
            const skip = (page - 1) * limit;

            // Build filter query
            const studentFilter = { class: classId, isRemoved: 0 }; // always active students

            if (filters.name) {
                studentFilter.name = { $regex: filters.name, $options: "i" }; // case-insensitive
            }
            if (filters.rollNo) studentFilter.rollNo = { $regex: filters.rollNo, $options: "i" };
            if (filters.section) studentFilter.section = filters.section;
            if (filters.academicYear) studentFilter.academicYear = filters.academicYear;
            if (filters.gender) studentFilter.gender = filters.gender;
            if (filters.status) studentFilter.status = filters.status;
            if (typeof filters.physicalDisability !== "undefined") {
                studentFilter.physicalDisability = filters.physicalDisability;
            }
            if (filters.bloodGroup) studentFilter.bloodGroup = filters.bloodGroup;

            // Run aggregation pipeline
            const result = await Class.aggregate(
                getClassWithStudentsPipeline(classId, skip, limit, studentFilter)
            );

            // Count total students matching filters for pagination
            const totalStudents = await Student.countDocuments(studentFilter);

            return {
                class: result[0] || null,
                pagination: {
                    page,
                    limit,
                    totalStudents,
                    totalPages: Math.ceil(totalStudents / limit)
                }
            };
        } catch (error) {
            console.error("getStudentAccordingClass error:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    // Get Student by ID
    getStudentById: async (studentId) => {
        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }
            const result = await Student.aggregate(getStudentDetailsPipeline(studentId));
            return result[0] || null;
        } catch (error) {
            console.error("getStudentById error:", error);
            return null;
        }
    },
}

module.exports = adminStudent