const gygAvailabilityService = require('../services/gygAvailability.service');


const getAvailability = async (req, res) => {
  try {
    const response = await gygAvailabilityService.getAvailability(
      req.query,
      req.headers.authorization
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error('Get Availability Error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal Server Error'
    });
  }
};


const create = async (req, res) => {
  try {
    const requestData = req.body?.data || req.body;
    const reservation = await gygAvailabilityService.createReservation(requestData);
    console.log("reservation------------------------------------",reservation)

    return res.status(200).json({ data: reservation });
  } catch (error) {
    console.error('Create Reservation Error:', error);
    return res.status(error.statusCode || 500).json({
      errorCode: error.errorCode || 'INTERNAL_SYSTEM_FAILURE',
      errorMessage: error.errorMessage || 'Internal server error',
      ...(error.ticketCategory && { ticketCategory: error.ticketCategory }),
      ...(error.participantsConfiguration && { participantsConfiguration: error.participantsConfiguration })
    });
  }
};


const createGYGAvailability = async (req, res) => {
  try {
    const availability = await gygAvailabilityService.createGYGAvailability();

    return res.status(201).json({
      message: "GYG availability created using hardcoded data",
      data: availability
    });
  } catch (error) {
    console.error("Create GYG Availability Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const createGYGAvailabilityone = async (req, res) => {
  try {
    const availability = await gygAvailabilityService.createGYGAvailabilityone();

    return res.status(201).json({
      message: "GYG availability created using hardcoded data",
      data: availability
    });
  } catch (error) {
    console.error("Create GYG Availability Error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const cancelReservation = async (req, res) => {
  try {
    const data = req.body;
    const reservation = await gygAvailabilityService.cancelReservation(data);

    return res.status(200).json({
      data: { reservationReference: reservation.reservationReference }
    });
  } catch (error) {
    console.error('Cancel Reservation Error:', error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Internal Server Error'
    });
  }
};


const createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    console.log("bookingData-----------------------------",bookingData)
    const newBooking = await gygAvailabilityService.createBooking(bookingData);
    return res.status(200).json(newBooking);
  } catch (error) {
    console.error('Create Booking Error:', error);
    return res.status(500).json({
      errorCode: 'INTERNAL_SYSTEM_FAILURE',
      errorMessage: 'Received invalid booking response from external system'
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const response = await gygAvailabilityService.cancelBooking(req.body);
    console.log('Controller: cancelBooking response:', JSON.stringify(response, null, 2));
    return res.status(200).json(response);
  } catch (error) {
    console.error('Cancel Booking Error:', error);
    return res.status(500).json({
      errorCode: 'INTERNAL_SYSTEM_FAILURE',
      errorMessage: 'Failed to cancel booking'
    });
  }
};


const getAllGygBookings = async (req, res) => {
  try {
    const bookings = await gygAvailabilityService.getAllGygBookings();
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get All Bookings Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAvailability,
  create,
  createGYGAvailability,
  createGYGAvailabilityone,
  cancelReservation,
  createBooking,
  cancelBooking,
  getAllGygBookings
};
