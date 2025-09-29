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
                classId,        // must be the specific class (e.g. 11A)
                academicYear,
                physicalDisability,
                disabilityDetails
            } = studentData;

            // 1️⃣ require a valid classId
            if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
                return { success: false, message: "CLASS_ID_REQUIRED_OR_INVALID" };
            }

            // 2️⃣ duplicate check
            const existingStudent = await Student.findOne({ $or: [{ email }, { phone }] });
            if (existingStudent) return { success: false, message: "STUDENT_ALREADY_EXISTS" };

            // 3️⃣ fetch class
            const classObj = await Class.findById(classId);
            if (!classObj) return { success: false, message: "CLASS_NOT_FOUND" };

            // 4️⃣ hash password
            const hashedPassword = await bcrypt.hash(password, 12);

            // 5️⃣ section comes directly from the class (no balancing!)
            const assignedSection = classObj.section;   // e.g. "A"

            // 6️⃣ generate next roll number
            const classNumber = classObj.name.replace(/\D/g, "");
            const lastEnrollment = await Enrollment
                .findOne({ class: classId, academicYear })
                .sort({ rollNo: -1 })
                .lean();

            let serial = 1;
            if (lastEnrollment?.rollNo) {
                const match = lastEnrollment.rollNo.match(/-(\d+)$/);
                if (match) serial = parseInt(match[1], 10) + 1;
            }
            const rollNo = `${classNumber}${assignedSection}-${String(serial).padStart(3, "0")}`;

            // 7️⃣ create student
            const admissionNo = "ADM-" + Date.now().toString().slice(-6);
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
                status: "active",
                classId,
                physicalDisability: physicalDisability || false,
                disabilityDetails: disabilityDetails || null,
            });

            // 8️⃣ create enrollment
            await Enrollment.create({
                student: student._id,
                class: classId,
                academicYear,
                section: assignedSection,
                rollNo
            });

            // 9️⃣ increment class count
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
        } catch (err) {
            console.error("Student register error:", err);
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

    updateStudentClass: async (studentId, classId) => {
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
            console.log('class object : ', classObj)
            if (!classObj) return { success: false, message: "CLASS_NOT_FOUND" };

            const assignedSection = classObj.section;

            // 3. Get last enrollment
            const lastEnrollment = await Enrollment.findOne({ student: studentId }).sort({ createdAt: -1 });
            if (!lastEnrollment) return { success: false, message: "ENROLLMENT_NOT_FOUND" };

            // 4. Compute next academic year
            const yearMatch = lastEnrollment.academicYear.match(/^(\d{4})-(\d{4})$/);
            if (!yearMatch) {
                return { success: false, message: "INVALID_LAST_ACADEMIC_YEAR_FORMAT" };
            }
            const nextAcademicYear = `${parseInt(yearMatch[1], 10) + 1}-${parseInt(yearMatch[2], 10) + 1}`;

            // 5. Block if same class
            if (String(lastEnrollment.class) === String(classId)) {
                return { success: false, message: "CLASS_IS_SAME_AS_PREVIOUS" };
            }

            // 6. Mark old enrollment as passed
            lastEnrollment.status = "Pass";
            await lastEnrollment.save();

            // 7. Derive class number & section directly from class name
            const match = classObj.name.match(/^(\d+)/);
            console.log('match : --------- ', match)
            if (!match) return { success: false, message: "CLASS_NAME_INVALID_FORMAT" };
            const classNumber = match[1];

            // 8. Generate next roll number
            const sectionCount = await Enrollment.countDocuments({
                class: classId,
                section: assignedSection,
                academicYear: nextAcademicYear
            });
            const serial = sectionCount + 1;
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

            // 10. Update student’s current details
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

            // 12. Send notification
            await sendEmail("class-section-change", {
                email: student.email,
                FirstName: student.name,
                CLASS_NAME: classObj.name,
                SECTION: assignedSection,
                ACADEMIC_YEAR: nextAcademicYear
            });

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

            // ---- Build dynamic filter for aggregation ----
            const studentFilter = {};
            if (filters.academicYear)
                studentFilter["enrollments.academicYear"] = filters.academicYear;
            if (filters.section)
                studentFilter["enrollments.section"] = filters.section;
            if (filters.rollNo)
                studentFilter["enrollments.rollNo"] = { $regex: filters.rollNo, $options: "i" };
            if (filters.name)
                studentFilter["student.name"] = { $regex: filters.name, $options: "i" };
            if (filters.gender)
                studentFilter["student.gender"] = filters.gender;
            // Add more filters as needed …

            const pipeline = getClassWithStudentsPipeline(
                classId,
                skip,
                limit,
                studentFilter
            );

            const data = await Class.aggregate(pipeline);

            // Total count for pagination
            const totalStudents = await Enrollment.countDocuments({
                class: new mongoose.Types.ObjectId(classId),
                ...(filters.academicYear && { academicYear: filters.academicYear }),
                ...(filters.section && { section: filters.section })
            });

            return {
                success: true,
                message: "STUDENT_FETCHED_SUCCESSFULLY",
                class: data,
                pagination: {
                    page,
                    limit,
                    totalStudents,
                    totalPages: Math.ceil(totalStudents / limit)
                }
            };
        } catch (error) {
            console.error("getStudentAccordingClass service error:", error);
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