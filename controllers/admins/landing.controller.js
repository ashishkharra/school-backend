const { responseData } = require('../../helpers/responseData.js')
const landingService = require('../../services/admins/landing.service.js')

const landingController = {

    homeGet: async (req, res) => {
        try {
            const result = await landingService.homeGet();
            if (!result.success) return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            return res.status(200).json(responseData(result?.message, result?.data, req, result?.success || true))
        } catch (error) {
            console.log('Error while fetching home : ', error)
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    },

    gallery: async (req, res) => {
        try {
            const result = await landingService.gallery(section);
            if (!result.success) return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            return res.status(200).json(responseData(result?.message, result?.data, req, result?.success || true))
        } catch (error) {
            console.log('Error while fetching data : ', error)
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    },

    about: async (req, res) => {
        try {
            const result = await landingService.about(section);
            if (!result.success) return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            return res.status(200).json(responseData(result?.message, result?.data, req, result?.success || true))
        } catch (error) {
            console.log('Error while fetching data : ', error)
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    },

    contactUs: async (req, res) => {
        try {
            const data = req.body
            const result = await landingService.contactUs(data);
            if (!result.success) return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            return res.status(200).json(responseData(result?.message, result?.data, req, result?.success || true))
        } catch (error) {
            console.log('Error while contacting : ', error)
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    },

    feedback: async (req, res) => {
        try {
            const data = req.body
            const result = await landingService.feedback(data);
            if (!result.success) return res.status(400).json(responseData(result?.message, {}, req, result?.success || false))
            return res.status(200).json(responseData(result?.message, result?.data, req, result?.success || true))
        } catch (error) {
            console.log('Error while contacting : ', error)
            return res.status(500).json(responseData('SERVER_ERROR', { error: error.message }, req, false))
        }
    }

}

module.exports = landingController