
const bcrypt = require('bcrypt');
const Teacher = require('../../models/teacher/teacher.schema');

module.exports = {
  registerTeacher: async (data) => {
    const { name, email, password, phone, dateOfBirth, gender, address, qualifications, classes, emergencyContact } = data;

    // Validation for required fields
    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required");
    }

    // Check if email already exists
    const existing = await Teacher.findOne({ email });
    if (existing) {
      throw new Error("Teacher with this email already exists");
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Prepare teacher data
    const newTeacher = new Teacher({
      name,
      email,
      password: hashedPassword,
      phone,
      dateOfBirth,
      gender,
      address,
      qualifications,
      classes,
      emergencyContact,
      role: 'teacher',
      // teacherId generated automatically by default in schema
    });

    await newTeacher.save();

    // Return safe teacher info without password and tokens
    return {
      id: newTeacher._id,
      teacherId: newTeacher.teacherId,
      name: newTeacher.name,
      email: newTeacher.email,
      phone: newTeacher.phone,
      dateOfBirth: newTeacher.dateOfBirth,
      gender: newTeacher.gender,
      address: newTeacher.address,
      qualifications: newTeacher.qualifications,
      classes: newTeacher.classes,
      dateOfJoining: newTeacher.dateOfJoining,
      emergencyContact: newTeacher.emergencyContact,
      role: newTeacher.role,
      createdAt: newTeacher.createdAt,
      updatedAt: newTeacher.updatedAt,
    };
  }
}