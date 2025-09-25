const Class = require('../../models/class/class.schema.js')

const adminClassService = {
    addClass: async (classData) => {
        try {
            const { name, subjects, section } = classData;

            const newClass = await Class.create({
                name,
                subjects,
                teacher: null,
                section,
                studentCount: 0,
            });

            console.log('new class : ', newClass)

            return {
                success: true,
                message: "Class created successfully",
                data: newClass,
            };
        } catch (error) {
            console.error("Error adding class:", error);

            return {
                success: false,
                message: "Failed to create class",
                error: error.message,
            };
        }
    },
}

module.exports = adminClassService