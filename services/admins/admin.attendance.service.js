const mongoose = require('mongoose')

const adminAttendanceService = {
    getAttendances: async (classId, section = null) => {
        try {
            
        } catch (error) {
            console.log('Error while getting attendance from service : ', error.message);
            return { success : false, message : 'SERVER_ERROR'}
        }
    }
}

module.exports = adminAttendanceService