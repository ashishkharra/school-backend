const studentController = require('../../../controllers/students/student.controller.js')
const studentService = require('../../../services/students/student.service.js')

// Mock the studentService
jest.mock('../../../services/students/student.service.js');

describe('viewAttendanceByClass', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: { studentId: '68e4b199da35b5cb0419b222' },
      headers: { language : 'en' },
      query: { month: '9', year: '2025', page: '1', limit: '10' },
      body: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should return 400 if studentId is missing', async () => {
    req.params.studentId = undefined;

    await studentController.viewAttendanceByClass(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "STUDENT_ID_REQUIRED"
    }));
  });

  it('should return 400 if studentId is invalid', async () => {
    req.params.studentId = 'invalidId';

    await studentController.viewAttendanceByClass(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "INVALID_STUDENT_ID"
    }));
  });

  it('should return attendance data if successful', async () => {
    const mockAttendance = { success: true, data: [{ date: '2025-10-07', status: 'present' }] };
    studentService.getAttendanceByClass.mockResolvedValue(mockAttendance);

    await studentController.viewAttendanceByClass(req, res);

    expect(studentService.getAttendanceByClass).toHaveBeenCalledWith(req.params.studentId, {
      month: 9,
      year: 2025,
      date: null,
      page: 1,
      limit: 10,
      teacherNameFilter: null
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "GET_ATTENDANCE",
      success: true
    }));
  });

  it('should handle service errors', async () => {
    studentService.getAttendanceByClass.mockResolvedValue({ success: false });

    await studentController.viewAttendanceByClass(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "ERROR_FETCHING_ATTENDANCE"
    }));
  });

  it('should handle unexpected exceptions', async () => {
    studentService.getAttendanceByClass.mockImplementation((err) => { console.log('err. ', err) });

    await studentController.viewAttendanceByClass(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "SOMETHING_WENT_WRONG"
    }));
  });
});
