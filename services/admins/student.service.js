const bcrypt = require('bcrypt');
const mongoose = require('mongoose')

const { generateOTP, sendEmail } = require('../../helpers/helper.js')

const Student = require("../../models/students/student.schema.js");
const Class = require("../../models/class/class.schema.js");
const Attendance = require('../../models/students/attendance.schema.js')
// const Fees = require('../../models/fees')
const Assignment = require('../../models/assignment/assignment.schema.js')
const Enrollment = require('../../models/students/studentEnrollment.schema.js');

const { getClassWithStudentsPipeline, getStudentDetailsPipeline, getStudentWithDetails } = require('../../helpers/commonAggregationPipeline.js')


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

            console.log('academic year : ', academicYear);

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
            enrollments.forEach(e => {
                if (sectionCounts[e.section] !== undefined) sectionCounts[e.section]++;
            });

            const assignedSection = Object.keys(sectionCounts).reduce(
                (a, b) => (sectionCounts[a] <= sectionCounts[b] ? a : b)
            );

            // ✅ 5. Generate next unique roll number
            const classNumber = classObj.name.replace(/\D/g, "");
            // Find the highest existing rollNo in this class/section/year
            const lastEnrollment = await Enrollment
                .findOne({ class: classId, section: assignedSection, academicYear })
                .sort({ rollNo: -1 })
                .lean();

            console.log('last enrollment : ', lastEnrollment)

            let serial = 1;
            if (lastEnrollment?.rollNo) {
                const match = lastEnrollment.rollNo.match(/-(\d+)$/);
                if (match) serial = parseInt(match[1], 10) + 1;
            }

            const rollNo = `${classNumber}${assignedSection}-${String(serial).padStart(3, "0")}`;
            console.log('roll no --------', rollNo);

            const admissionNo = "ADM-" + Date.now().toString().slice(-6);

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
            console.error("Student register error:", error);
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

            const mail = await sendEmail("profile-updated-notification", {
                email: updatedStudent.email,
                FirstName: updatedStudent.name,
                EMAIL: updatedStudent.email,
                MOBILE: updatedStudent.phone
            });

            console.log(mail)

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

    updateStudentClass: async (studentId, classId, section = null) => {
        try {
            // Validate IDs
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" };
            }
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return { success: false, message: "CLASS_ID_NOT_VALID" };
            }

            // 1. Find student
            const student = await Student.findById(studentId);
            if (!student) return { success: false, message: "STUDENT_NOT_FOUND" };

            // 2. Find target class
            const classObj = await Class.findById(classId);
            if (!classObj) return { success: false, message: "CLASS_NOT_FOUND" };

            // 3. Get last enrollment
            const lastEnrollment = await Enrollment.findOne({ student: studentId }).sort({ createdAt: -1 });
            if (!lastEnrollment) return { success: false, message: "ENROLLMENT_NOT_FOUND" };

            // 4. Compute next academic year
            const yearMatch = lastEnrollment.academicYear.match(/^(\d{4})-(\d{4})$/);
            if (!yearMatch) {
                return { success: false, message: "INVALID_LAST_ACADEMIC_YEAR_FORMAT" };
            }
            const lastStart = parseInt(yearMatch[1], 10);
            const lastEnd = parseInt(yearMatch[2], 10);
            const nextAcademicYear = `${lastStart + 1}-${lastEnd + 1}`;

            // 5. If class is not changing, block promotion
            if (String(lastEnrollment.class) === String(classId)) {
                return { success: false, message: "CLASS_IS_SAME_AS_PREVIOUS" };
            }

            // 6. Mark old enrollment as Passed
            lastEnrollment.status = "Pass";
            await lastEnrollment.save();

            // 7. Decide section
            let assignedSection = section;
            if (!assignedSection) {
                // Auto-balance sections if principal didn't provide
                const sectionCounts = {};
                const enrollments = await Enrollment.find({ class: classId, academicYear: nextAcademicYear });
                enrollments.forEach((e) => {
                    const s = e.section || "A";
                    sectionCounts[s] = (sectionCounts[s] || 0) + 1;
                });

                // If no sections exist, default to A
                if (Object.keys(sectionCounts).length === 0) {
                    assignedSection = "A";
                } else {
                    assignedSection = Object.keys(sectionCounts).reduce((a, b) =>
                        sectionCounts[a] <= sectionCounts[b] ? a : b
                    );
                }
            }

            // 8. Generate roll number
            const sectionCount = await Enrollment.countDocuments({
                class: classId,
                section: assignedSection,
                academicYear: nextAcademicYear
            });
            const serial = sectionCount + 1;
            const classNumber = (classObj.name && classObj.name.match(/\d+/)?.[0]) || classObj.name || "CLS";
            const newRollNo = `${classNumber}${assignedSection}-${String(serial).padStart(3, "0")}`;

            // 9. Create new enrollment
            const newEnrollment = await Enrollment.create({
                student: studentId,
                class: classId,
                academicYear: nextAcademicYear,
                section: assignedSection,
                rollNo: newRollNo,
                status: "Ongoing"
            });

            // 10. Update student's current details
            student.class = classId;
            student.section = assignedSection;
            student.academicYear = nextAcademicYear;
            student.rollNo = newRollNo;
            await student.save();

            // 11. Update class student count
            classObj.studentCount = await Enrollment.countDocuments({
                class: classId,
                academicYear: nextAcademicYear
            });
            await classObj.save();

            const classChangeData = {
                email: student.email,
                FirstName: student.name,
                CLASS_NAME: classObj.name,
                SECTION: assignedSection,
                ACADEMIC_YEAR: nextAcademicYear
            };

            await sendEmail("class-section-change", classChangeData);

            return {
                success: true,
                student,
                enrollment: newEnrollment,
                message: "STUDENT_PROMOTED_TO_NEW_CLASS"
            };

        } catch (error) {
            console.error("UpdateStudentClass error:", error);
            return { success: false, message: "SERVER_ERROR", error: error.message };
        }
    },

    updateStudentSection: async (classId, studentId, newSection) => {
        try {
            // 1. Validate IDs
            if (!mongoose.Types.ObjectId.isValid(studentId)) {
                return { success: false, message: "STUDENT_ID_NOT_VALID" };
            }
            if (!mongoose.Types.ObjectId.isValid(classId)) {
                return { success: false, message: "CLASS_ID_NOT_VALID" };
            }

            // 2. Fetch student and class
            const student = await Student.findById(studentId);
            if (!student) return { success: false, message: "STUDENT_NOT_FOUND" };

            const classObj = await Class.findById(classId);
            if (!classObj) return { success: false, message: "CLASS_NOT_FOUND" };

            // 3. Fetch latest enrollment for this class
            const lastEnrollment = await Enrollment.findOne({ class: classId, student: studentId }).sort({ createdAt: -1 });
            if (!lastEnrollment) return { success: false, message: "ENROLLMENT_NOT_FOUND" };

            // 4. Check if section is same
            if (lastEnrollment.section === newSection) {
                return { success: false, message: "STUDENT_ALREADY_IN_SECTION" };
            }

            lastEnrollment.section = newSection;
            // 6. Count number of students in new section to generate roll number
            const sectionCount = await Enrollment.countDocuments({
                class: classId,
                section: newSection,
                academicYear: lastEnrollment.academicYear
            });
            const serial = sectionCount + 1;
            const classNumber = classObj.name.match(/\d+/)?.[0] || classObj.name;
            const newRollNo = `${classNumber}${newSection}-${String(serial).padStart(3, "0")}`;

            // 7. save enrollment with updated section
            lastEnrollment.rollNo = newRollNo;
            await lastEnrollment.save()

            // 9. Update class student count
            classObj.studentCount = await Enrollment.countDocuments({ class: classId, academicYear: lastEnrollment.academicYear });
            await classObj.save();

            await sendEmail("student-section-change", {
                email: student.email,
                FirstName: student.name.split(" ")[0],
                CLASS_NAME: classObj.name,
                NEW_SECTION: newSection,
                ACADEMIC_YEAR: lastEnrollment.academicYear,
                ROLL_NO: newRollNo
            });

            return {
                success: true,
                message: "STUDENT_SECTION_UPDATED_SUCCESSFULLY",
                student
            };
        } catch (error) {
            console.error("updateStudentSection error:", error);
            return { success: false, message: "STUDENT_SECTION_UPDATE_FAILED", error: error.message };
        }
    },

    deleteStudent: async (studentId, adminId, reason = 'No reason provided') => {
        try {
            if (!mongoose.Types.ObjectId.isValid(studentId))
                return { success: false, message: 'STUDENT_ID_NOT_VALID' };
            if (!mongoose.Types.ObjectId.isValid(adminId))
                return { success: false, message: 'ADMIN_ID_NOT_VALID' };

            // Aggregate everything in one go
            const studentData = await getStudentWithDetails(studentId);
            if (!studentData) return { success: false, message: 'STUDENT_NOT_FOUND' };

            if (studentData.isRemoved === 1)
                return { success: false, message: 'STUDENT_ALREADY_REMOVED' };

            // Soft delete student
            await Student.updateOne(
                { _id: studentId },
                {
                    $set: {
                        status: 'inactive',
                        isRemoved: 1,
                        removedAt: new Date(),
                        removedReason: reason,
                        removedBy: adminId
                    }
                }
            );

            // Soft delete all enrollments
            await Enrollment.updateMany(
                { student: studentId },
                { $set: { status: 'Pass' } }
            );

            console.log('student data : ', studentData)

            // Send email
            await sendEmail('student-soft-delete', {
                email: studentData.email,
                PARENT_NAME:
                    studentData.parents?.[0]?.name ||
                    studentData.guardian?.name ||
                    'Parent/Guardian',
                STUDENT_NAME: studentData.name,
                ROLL_NO: studentData.enrollments?.rollNo || '',
                CLASS_NAME: studentData.classInfo?.name || '',
                ACADEMIC_YEAR: studentData.enrollments?.academicYear || '',
                REASON: reason
            });

            return {
                success: true,
                message: 'STUDENT_SOFT_DELETED',
                student: {
                    id: studentId,
                    name: studentData.name,
                    email: studentData.email,
                    status: 'inactive',
                    isRemoved: 1,
                    removedAt: new Date(),
                    removedReason: reason,
                    removedBy: adminId
                }
            };
        } catch (err) {
            console.error('deleteStudent error:', err);
            return { success: false, message: 'SERVER_ERROR' };
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
                message: 'STUDENT_FETCHED_SUCCESSFULLY',
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

            if (!result) return { success: false, message: "STUDENT_PROFILE_ERROR" }

            return {
                success: true,
                message: "STUDENT_FETCHED_SUCCESSFULLY",
                result
            }
        } catch (error) {
            console.error("getStudentById error:", error);
            return { success: false, message: "SERVER_ERROR" }
        }
    },
}

module.exports = adminStudent