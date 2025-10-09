const authService = require("../services/auth.role.service");
const { responseData } = require("../helpers/responseData");

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    return res.json(
      responseData(result.message, result.results, req, result.success)
    );
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json(responseData("SERVER_ERROR", {error : error.message}, req, false));
  }
};
