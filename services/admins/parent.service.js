const mongoose = require('mongoose')
const Student = require('../../models/students/student.schema.js')
const Meeting = require('../../models/students/meeting.schema.js')
const Teacher = require('../../models/teacher/teacher.schema.js')
const { sendEmail, createZoomMeeting } = require('../../helpers/helper.js')

const adminParentService = {

    scheduleMeeting: async (studentId, meetData, hostId) => {
        try {

            if (!mongoose.Types.ObjectId.isValid(studentId)) return { status: 400, success: false, message: 'STUDENT_ID_NOT_VALID' };
            if (!mongoose.Types.ObjectId.isValid(hostId)) return { status: 400, success: false, message: 'HOST_ID_NOT_VALID' };

            const student = await Student.findById(studentId);
            if (!student) return { status: 404, success: false, message: 'STUDENT_NOT_FOUND' };

            let receiver = ""
            if (student.parents?.[0]?.email) {
                receiver = student.parents[0];
            } else if (student.guardian?.email) {
                receiver = student.guardian;
            }

            if (!receiver?.email) {
                return { status: 404, success: false, message: 'CONTACT_NOT_FOUND' };
            }

            let host = await Admin.findById(hostId);
            if (!host) {
                host = await Teacher.findById(hostId);
            }

            if (!host) {
                return { status: 404, success: false, message: 'HOST_NOT_FOUND' };
            }

            const zoomData = await createZoomMeeting({
                topic: `Parent Meeting for ${student.name}`,
                start_time: meetData.date
            });

            const meeting = await Meeting.create({
                studentId,
                meetingDate: meetData.date,
                reason: meetData.reason,
                notes: meetData.notes,
                zoomMeetingId: zoomData.id,
                zoomJoinUrl: zoomData.join_url,
                zoomStartUrl: zoomData.start_url,
                zoomPassword: zoomData.password,
                createdBy: hostId
            });

            const dataBody = {
                to: receiver.email,
                ParentName: receiver.name,
                StudentName: student.name,
                Date: meetData.date,
                Reason: meetData.reason,
                HostName: host.name,
                HostRole: host.role,
                SchoolName: "Bright Future School"
            };

            await sendEmail('parent-meeting-notification', dataBody);

            meeting.notifications.push({
                title: 'Parent-Teacher Meeting Scheduled',
                body: `Meeting scheduled on ${meetData.date} for ${meetData.reason} by ${host.name} (${host.role})`,
                to: receiver.email,
                sentAt: new Date(),
                status: 'sent'
            });

            await meeting.save();

            return { status: 200, success: true, message: 'MEETING_SCHEDULED_SUCCESSFULLY', data: meeting };

        } catch (error) {
            console.error('Error scheduling meeting:', error);
            return { status: 500, success: false, message: 'SOMETHING_WENT_WRONG' };
        }
    },

    sendMeetingReminder: async (meeting) => {
        try {
            const student = await Student.findById(meeting.studentId);
            const parent = student.parents[0];
            const host = await Admin.findById(meeting.createdBy);

            if (!parent?.email || !host) return;

            const dataBody = {
                to: parent.email,
                ParentName: parent.name,
                StudentName: student.name,
                Date: meeting.meetingDate,
                Reason: meeting.reason,
                HostName: host.name,
                HostRole: host.role,
                ZoomLink: meeting.zoomJoinUrl,
                ZoomPassword: meeting.zoomPassword,
                SchoolName: "Bright Future School"
            };

            await sendEmail('parent-meeting-reminder', dataBody);

            meeting.reminderSent = true;
            meeting.reminderSentAt = new Date();
            meeting.notifications.push({
                title: 'Parent-Teacher Meeting Reminder',
                body: `Reminder: Meeting will start at ${meeting.meetingDate}`,
                to: parent.email,
                sentAt: new Date(),
                status: 'sent'
            });

            await meeting.save();

        } catch (error) {
            console.error('Error sending meeting reminder:', error);
        }
    },

    updateMeeting: async (meetingId, updateData, hostId) => {
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return { status: 404, success: false, message: 'MEETING_NOT_FOUND' };


            let host = await Admin.findById(hostId);
            if (!host) host = await Teacher.findById(hostId);
            if (!host) return { status: 404, success: false, message: 'HOST_NOT_FOUND' };

            const student = await Student.findById(meeting.studentId);
            if (!student) return { status: 404, success: false, message: 'STUDENT_NOT_FOUND' };

            let receiver = student.parents?.[0] || student.guardian;
            if (!receiver?.email) return { status: 404, success: false, message: 'CONTACT_NOT_FOUND' };

            if (updateData.meetingDate && new Date(updateData.meetingDate).getTime() !== meeting.meetingDate.getTime()) {
                const zoomData = await createZoomMeeting({
                    topic: `Parent Meeting for ${student.name}`,
                    start_time: updateData.meetingDate
                });

                meeting.zoomMeetingId = zoomData.id;
                meeting.zoomJoinUrl = zoomData.join_url;
                meeting.zoomStartUrl = zoomData.start_url;
                meeting.zoomPassword = zoomData.password;
            }

            meeting.meetingDate = updateData.meetingDate || meeting.meetingDate;
            meeting.reason = updateData.reason || meeting.reason;
            meeting.notes = updateData.notes || meeting.notes;
            meeting.updatedBy = host._id;

            const dataBody = {
                to: receiver.email,
                ParentName: receiver.name,
                StudentName: student.name,
                Date: meeting.meetingDate,
                Reason: meeting.reason,
                HostName: host.name,
                HostRole: host.role,
                SchoolName: "Bright Future School"
            };
            await sendEmail('parent-meeting-updated', dataBody);

            meeting.notifications.push({
                title: 'Parent-Teacher Meeting Updated',
                body: `Meeting updated for ${meeting.meetingDate} (${meeting.reason}) by ${host.name} (${host.role})`,
                to: receiver.email,
                sentAt: new Date(),
                status: 'sent'
            });

            await meeting.save();

            return { status: 200, success: true, message: 'MEETING_UPDATED_SUCCESSFULLY', data: meeting };

        } catch (error) {
            console.error('Error updating meeting:', error);
            return { status: 500, success: false, message: 'SOMETHING_WENT_WRONG' };
        }
    },

    removeMeeting: async (meetingId, status, hostId) => {
        try {
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) return { status: 404, success: false, message: 'MEETING_NOT_FOUND' };

            let host = await Admin.findById(hostId);
            if (!host) host = await Teacher.findById(hostId);
            if (!host) return { status: 404, success: false, message: 'HOST_NOT_FOUND' };

            const student = await Student.findById(meeting.studentId);
            if (!student) return { status: 404, success: false, message: 'STUDENT_NOT_FOUND' };

            let receiver = null;
            if (student.parents?.[0]?.email) receiver = student.parents[0];
            else if (student.guardian?.email) receiver = student.guardian;
            if (!receiver?.email) return { status: 404, success: false, message: 'CONTACT_NOT_FOUND' };

            meeting.status = status;
            meeting.updatedBy = host._id;

            const notificationText = `Meeting scheduled on ${meeting.meetingDate} has been ${status} by ${host.name} (${host.role}).`;
            meeting.notifications.push({
                title: 'Meeting Cancelled',
                body: notificationText,
                to: receiver.email,
                sentAt: new Date(),
                status: 'sent'
            });

            await meeting.save();

            const dataBody = {
                to: receiver.email,
                ParentName: receiver.name,
                StudentName: student.name,
                Date: meeting.meetingDate,
                Reason: meeting.reason,
                HostName: host.name,
                HostRole: host.role,
                SchoolName: 'Bright Future School'
            };

            await sendEmail('parent-meeting-cancelled', dataBody);

            return { status: 200, success: true, message: 'MEETING_CANCELLED_SUCCESSFULLY', data: meeting };

        } catch (error) {
            console.error('Error in removeMeeting service:', error);
            return { status: 500, success: false, message: 'SOMETHING_WENT_WRONG' };
        }
    }

}

module.exports = adminParentService