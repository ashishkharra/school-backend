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

            console.log('academic year : ', academicYear)

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
                status: 'active',
                emergencyContact,
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

    // Service: adminStudent.js
    updateStudentClass: async (studentId, classId, section = null, academicYear, status = null) => {
        console.log(studentId, classId, section, academicYear, status)
        try {
            // 1. Find student
            const student = await Student.findById(studentId);
            console.log('student---------> ', student);
            if (!student) return { success: false, message: "STUDENT_NOT_FOUND" };

            // 2. Find class
            const classObj = await Class.findById(classId);
            console.log('class object ---------> ', classObj)
            if (!classObj) return { success: false, message: "CLASS_NOT_FOUND" };

            // 3. Get last enrollment
            const lastEnrollment = await Enrollment.findOne({ student: studentId }).sort({ createdAt: -1 });
            console.log('last enrollment ----------> ', lastEnrollment)
            if (!lastEnrollment) return { success: false, message: "ENROLLMENT_NOT_FOUND" };

            // 4. Determine if this is a new academic year (promotion)
            const targetYear = academicYear ? String(academicYear) : null;
            const lastYear = lastEnrollment.academicYear ? String(lastEnrollment.academicYear) : null;
            const isNewYear = targetYear && targetYear !== lastYear;

            console.log('targetYear : ', targetYear);
            console.log('last year : ', lastYear);
            console.log("is new year : ", isNewYear)

            let assignedSection = section;

            // Auto assign section if not provided
            if (!assignedSection) {
                const sectionCounts = { A: 0, B: 0, C: 0, D: 0 };
                const enrollments = await Enrollment.find({ class: classId, academicYear: targetYear || lastYear });
                enrollments.forEach((e) => {
                    if (sectionCounts[e.section] !== undefined) sectionCounts[e.section]++;
                });
                assignedSection = Object.keys(sectionCounts).reduce((a, b) =>
                    sectionCounts[a] <= sectionCounts[b] ? a : b
                );
            }

            // Generate new roll number
            const sectionCount = await Enrollment.countDocuments({
                class: classId,
                section: assignedSection,
                academicYear: targetYear || lastYear
            });
            const serial = sectionCount + 1;
            const classNumber = classObj.name.match(/\d+/)?.[0] || classObj.name;
            const newRollNo = `${classNumber}${assignedSection}-${String(serial).padStart(3, "0")}`;

            if (isNewYear) {
                // 5a. Update last enrollment status (pass/fail/drop)
                if (status) {
                    lastEnrollment.status = status;
                    await lastEnrollment.save();
                }

                // 5b. Create new enrollment for new year/class
                const newEnrollment = await Enrollment.create({
                    student: studentId,
                    class: classId,
                    academicYear: targetYear,
                    section: assignedSection,
                    rollNo: newRollNo,
                    status: "Ongoing"
                });

                console.log('New enrollment : ', newEnrollment)

                // 6. Update student record with new rollNo, section, academicYear
                student.rollNo = newRollNo;
                student.section = assignedSection;
                student.academicYear = targetYear;
                await student.save();

                // 7. Update class student count
                classObj.studentCount = await Enrollment.countDocuments({ class: classId, academicYear: targetYear });
                await classObj.save();

                return { success: true, student, enrollment: newEnrollment, message: "STUDENT_PROMOTED_SUCCESSFULLY" };
            } else {
                // 5. Only section change → update existing enrollment
                lastEnrollment.section = assignedSection;
                lastEnrollment.rollNo = newRollNo;
                await lastEnrollment.save();

                student.rollNo = newRollNo;
                student.section = assignedSection;
                await student.save();

                classObj.studentCount = await Enrollment.countDocuments({ class: classId, academicYear: lastYear });
                await classObj.save();

                return { success: true, student, enrollment: lastEnrollment, message: "STUDENT_SECTION_UPDATED" };
            }
        } catch (error) {
            console.error("UpdateStudentClass error:", error);
            return { success: false, message: "SERVER_ERROR" };
        }
    },

    deleteStudent: async (studentId, adminId, reason = "No reason provided") => {
        try {
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }

            if (!mongoose.Types.ObjectId.isValid(adminId)) {
                return { success: false, message: "ADMIN_ID_NOT_VALID" }
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
                { $set: { status: "Pass" } }
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
            console.log('filteres : ', filters)

            // Build student filter
            const studentFilter = {};
            if (filters.name)
                studentFilter["student.name"] = { $regex: filters.name, $options: "i" };
            if (filters.rollNo)
                studentFilter["enrollments.rollNo"] = { $regex: filters.rollNo, $options: "i" };
            if (filters.section)
                studentFilter["enrollments.section"] = filters.section;
            if (filters.academicYear)
                studentFilter["enrollments.academicYear"] = filters.academicYear;
            if (filters.gender)
                studentFilter["student.gender"] = filters.gender;
            if (filters.status)
                studentFilter["enrollments.status"] = filters.status;
            if (typeof filters.physicalDisability !== "undefined")
                studentFilter["student.physicalDisability"] = filters.physicalDisability;
            if (filters.bloodGroup)
                studentFilter["student.bloodGroup"] = filters.bloodGroup;
            if (filters.parentsName)
                studentFilter["student.parents.name"] = { $regex: filters.parentsName, $options: "i" };
            if (filters.guardianName)
                studentFilter["student.guardian.name"] = { $regex: filters.guardianName, $options: "i" };
            if (filters.emergencyContactName)
                studentFilter["student.emergencyContact.name"] = { $regex: filters.emergencyContactName, $options: "i" };
            if (filters.siblingName)
                studentFilter["student.siblings.name"] = { $regex: filters.siblingName, $options: "i" };
            if (filters.achievementTitle)
                studentFilter["student.achievements.title"] = { $regex: filters.achievementTitle, $options: "i" };
            if (filters.activity)
                studentFilter["student.extraCurricular.activity"] = { $regex: filters.activity, $options: "i" };
            if (filters.subjectName)
                studentFilter["student.subjectsEnrolled.subjectName"] = { $regex: filters.subjectName, $options: "i" };

            console.log('student filters : ', studentFilter)
            // Run pipeline
            const pipeline = getClassWithStudentsPipeline(classId, skip, limit, studentFilter);
            console.log('pipeline : ', pipeline)
            const result = await Class.aggregate(pipeline);
            console.log('result : ', result)

            // Count total students for pagination
            const totalStudents = await Enrollment.countDocuments({
                class: new mongoose.Types.ObjectId(classId)
            });

            console.log('total count : ', totalStudents)

            return {
                message : 'STUDENT_FETCHED_SUCCESSFULLY',
                class: result || [],
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
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" }
            }
            const result = await Student.aggregate(getStudentDetailsPipeline(studentId));

            console.log('result of student : ', result)
            
            if(!result) return {success : false, message : "STUDENT_PROFILE_ERROR"}

            return {
                success : true,
                message : "STUDENT_FETCHED_SUCCESSFULLY",
                result
            }
        } catch (error) {
            console.error("getStudentById error:", error);
            return { success : false, message : "SERVER_ERROR" }
        }
    },
}

module.exports = adminStudent