// const AwsUrlsModel = require('../../models/awsUrls.model')
// const {deleteImageFromS3} = require('../../configs/aws_delete')
// const awsUrl = async (req, res) => {
//     try {
//         const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

//         const documentsToDelete = await AwsUrlsModel.find({
//             status: 'unused',
//             createdAt: { $lt: thirtyMinutesAgo }
//         });

//         await AwsUrlsModel.deleteMany({
//             status: 'unused',
//             createdAt: { $lt: thirtyMinutesAgo }
//         });

//         for (const document of documentsToDelete) {
//             await deleteImageFromS3(process.env.AWS_BUCKET_NAME, document?.key)
//         }

//         console.log(' Unused aws urls documents has been deleted successfully.')
//     } catch (error) {
//         return res.json(responseData('ERROR_OCCUR', error.message, req, false))
//     }
// }


// module.exports = awsUrl 


const cron = require('node-cron');
const Meeting = require('../../models/students/meeting.schema.js');
const adminParentService = require('../admins/parent.service.js');

cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

        const meetingsToRemind = await Meeting.find({
            reminderSent: false,
            meetingDate: { $gte: oneHourLater, $lt: new Date(oneHourLater.getTime() + 60 * 1000) },
            status: 'scheduled'
        });

        for (const meeting of meetingsToRemind) {
            await adminParentService.sendMeetingReminder(meeting);
        }

        console.log('Meeting reminders processed successfully.');
    } catch (error) {
        console.error('Error processing meeting reminders:', error);
    }
});

