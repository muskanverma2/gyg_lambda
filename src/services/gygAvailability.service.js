const {GygBooking,GygReserve,Recurrence} = require('../models');
const {getRecurrenceByProductId} = require('../services/recurrence.service')
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

const normalizeCategory = (label = '') => {
  const l = label.toLowerCase();
  if (l.includes('adult')) return 'ADULT';
  if (l.includes('child')) return 'CHILD';
  return null;
};

// const buildRetailPrices = (product) => {
//   const priceMap = {};
//   const rates = Array.isArray(product?.rates) ? product.rates : [];
//   rates.forEach((rate) => {
//     const prices = Array.isArray(rate?.price) ? rate.price : [];
//     prices.forEach((p) => {
//       const category = normalizeCategory(p?.label);
//       if (!category) return;
//       const price = Number(p?.fields?.[0]?.pricePerParticipant);
//       if (isNaN(price)) return;
//       priceMap[category] = price;
//     });
//   });

//   return Object.entries(priceMap).map(([category, price]) => ({
//     category,
//     price,
//   }));
// };

const buildRetailPrices = (product) => {
  const priceMap = {};
  const rates = Array.isArray(product?.rates) ? product.rates : [];

  rates.forEach((rate) => {
    const prices = Array.isArray(rate?.price) ? rate.price : [];
    prices.forEach((p) => {
      const category = normalizeCategory(p?.label);
      if (!category) return;

      const price = Number(p?.fields?.[0]?.pricePerParticipant);
      if (isNaN(price)) return;

      priceMap[category] = price;
    });
  });

  const result = Object.entries(priceMap).map(([category, price]) => ({
    category,
    price,
  }));

  // ✅ FALLBACK if empty
  if (!result.length) {
    return [
      { category: 'CHILD', price: 100 },
      { category: 'ADULT', price: 150 }
    ];
  }

  return result;
};


// const getAvailability = async (query) => {
//   try {
//     const { productId, fromDateTime } = query;
//     console.log("query-----------------------------", query);

//     if (!productId || !fromDateTime) {
//       return {
//         data: null,
//         errorCode: 'VALIDATION_FAILURE',
//         errorMessage: 'Missing required parameters.'
//       };
//     }

//     // Find product
//     const product = await Recurrence.findOne({ productId });
//     console.log("product-----------------------------", product);

//     if (!product) {
//       return {
//         errorCode: 'INVALID_PRODUCT',
//         errorMessage: 'This activity should be deactivated; not sellable.'
//       };
//     }

//     // Get availabilities matching startDate
//     let availabilities = [];
//     try {
//       availabilities = await getRecurrenceByProductId(productId, fromDateTime);
//     } catch (err) {
//       return { data: { availabilities: [] } };
//     }

//     console.log(availabilities, "Matched availabilities");

//     if (!availabilities.length) return { data: { availabilities: [] } };

//     // Map to API response
//     const response = availabilities.map(a => ({
//       productId: a.productId,
//       dateTime: a.startDate, // string from DB
//       cutoffSeconds: a.bookingCutOffTime || 3600,
//       currency: product.currency || 'EUR',
//       pricesByCategory: { retailPrices: buildRetailPrices(product) },
//       vacanciesByCategory: [
//         { category: 'ADULT', vacancies: 6 },
//         { category: 'CHILD', vacancies: 4 }
//       ]
//     }));

//     return { data: { availabilities: response } };

//   } catch (error) {
//     console.error(error);
//     return {
//       data: null,
//       errorCode: 'VALIDATION_FAILURE',
//       errorMessage: 'The request object contains invalid or inconsistent data.'
//     };
//   }
// };

const getAvailability = async (query) => {
  try {
    const { productId, fromDateTime } = query;
    console.log("query-----------------------------", query);

    // ✅ Validation
    if (!productId || !fromDateTime) {
      return {
        errorCode: 'VALIDATION_FAILURE',
        errorMessage: 'Missing required parameters.'
      };
    }

    // ✅ Find product
    const product = await Recurrence.findOne({ productId });
    console.log("product-----------------------------", product);

    if (!product) {
      return {
        errorCode: 'INVALID_PRODUCT',
        errorMessage: 'This activity should be deactivated; not sellable.'
      };
    }

    // ✅ Get availabilities
    let availabilities = [];
    try {
      availabilities = await getRecurrenceByProductId(productId, fromDateTime);
    } catch (err) {
      console.error('Error fetching availabilities:', err);
      return { data: { availabilities: [] } };
    }

    if (!availabilities.length) {
      return { data: { availabilities: [] } };
    }

    // ✅ Helper
    const toIsoWithoutMillis = (date) =>
      new Date(date).toISOString().replace(/\.\d{3}Z$/, 'Z');

    const response = availabilities.map(a => ({
      productId: a.productId,
      dateTime: toIsoWithoutMillis(a.startDate),
      cutoffSeconds: a.bookingCutOffTime || 3600,
      currency: product.currency || 'EUR',
      pricesByCategory: {
        retailPrices: buildRetailPrices(product)
      },
      vacanciesByCategory: [
        { category: 'ADULT', vacancies: 6 },
        { category: 'CHILD', vacancies: 4 }
      ]
    }));

    return { data: { availabilities: response } };

  } catch (error) {
    console.error('getAvailability error:', error);
    return {
      errorCode: 'VALIDATION_FAILURE',
      errorMessage: 'The request object contains invalid or inconsistent data.'
    };
  }
};



// Create a reservation
const createReservation = async (input) => {
  try {
    const body = input?.data || input;
    const { productId, dateTime, bookingItems, gygBookingReference } = body;
    const startDate = dayjs.utc(dateTime.replace(' ', '+'));

    if (!productId || !dateTime || !Array.isArray(bookingItems) || !bookingItems.length) {
      throw { statusCode: 400, errorCode: 'VALIDATION_FAILURE', errorMessage: 'Missing required parameters.' };
    }

    const product = await Recurrence.findOne({ productId: productId });
    if (!product) throw { errorCode:"INVALID_PRODUCT", errorMessage:"This activity should be deactivated; not sellable." };

    let availabilities = [];
    try {
      availabilities = await getRecurrenceByProductId(productId, startDate.toISOString(), startDate.toISOString());
    } catch (err) {
      throw { errorCode: 'NO_AVAILABILITY', errorMessage: 'This activity is sold out; requested 3; available 0.' };
    }
   if (!availabilities.length) {
  return {
    errorCode: 'NO_AVAILABILITY',
    errorMessage: 'No availability for the selected date.'
  };
}


    for (const item of bookingItems) {
      if (item.category === 'STUDENT') {
        throw { statusCode: 400, errorCode: 'INVALID_TICKET_CATEGORY', errorMessage: 'Ticket category STUDENT is not supported for this product', ticketCategory: 'STUDENT' };
      }
    }

    const maxAllowed = product.maxParticipants ?? 3;
    const totalParticipants = bookingItems.reduce((sum, item) => sum + Number(item.count || 0), 0);
    if (totalParticipants > maxAllowed) {
      throw { statusCode: 400, errorCode: 'INVALID_PARTICIPANTS_CONFIGURATION', errorMessage: `Maximum ${maxAllowed} participants allowed.`, participantsConfiguration: { min: 1, max: maxAllowed } };
    }

    const reservationReference = `GYG${Date.now()}${Math.floor(Math.random() * 10000)}`;

    await GygReserve.create({
      productId,
      dateTime,
      bookingItems,
      reservationReference,
      gygBookingReference
    });

    return {
      reservationReference,
      reservationExpiration: new Date(Date.now() + 15 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
    };
  } catch (err) {
    console.error('GYG reservation error:', err);
    throw err;
  }
};

// Create hardcoded GYG availability
const createGYGAvailability = async () => ({
  productId: "1c33337daeed4274bded",
  timeAvailable: { type: "TIME_PERIOD", operationHours: { from: "09:00", to: "18:00" } },
  priceSetup: { type: "PER_INDIVIDUAL" },
  autoConfiguration: { mode: "AVAILABILITY_ONLY", availabilityType: "TOTAL_AVAILABILITIES" },
  participantsConfiguration: { min: 1, max: 1 },
  ticketCategories: { supported: ["ADULT", "CHILD"], notSupported: ["STUDENT"] },
  timezone: "UTC",
  dateAvailability: { from: "2025-12-21", to: "2025-12-31" }
});

const createGYGAvailabilityone = async () => ({
  productId: "2c33337ft456274bdedm",
  timeAvailable: { type: "TIME_POINT", operationHours: { from: "09:00", to: "18:00" } },
  priceSetup: { type: "PER_GROUP" },
  autoConfiguration: { mode: "AVAILABILITY_ONLY", availabilityType: "AVAILABILITY BY TICKET CATEGORY" },
  participantsConfiguration: { min: 1, max: 1 },
  ticketCategories: { supported: ["ADULT", "CHILD"], notSupported: ["STUDENT"] },
  timezone: "UTC",
  dateAvailability: { from: "2025-12-21", to: "2025-12-31" }
});

// Cancel a reservation
const cancelReservation = async (data) => ({
  data: { reservationReference: `GYG${Date.now()}${Math.floor(Math.random() * 100000)}` }
});

// Create a booking
const createBooking = async (bookingData) => {
  try {
    const payload = bookingData?.data;
    if (!payload) throw new Error('Missing data object');
    const { gygBookingReference, bookingItems } = payload;
    if (!Array.isArray(bookingItems) || !bookingItems.length) throw new Error('bookingItems must be a non-empty array');

    let ticketIndex = 1;
    const tickets = [];
    bookingItems.forEach(item => {
      for (let i = 0; i < Number(item.count); i++) {
        tickets.push({ category: item.category, ticketCode: `code${String(ticketIndex).padStart(3,'0')}`, ticketCodeType: 'QR_CODE' });
        ticketIndex++;
      }
    });

    const bookingReference = `bk${Date.now()}`;
    await GygBooking.create({ ...payload, gygBookingReference, bookingReference, tickets });

    return { data: { bookingReference, tickets } };
  } catch (error) {
    console.error(error);
    throw new Error('Error creating GYG booking: ' + error.message);
  }
};

// Cancel a booking
const cancelBooking = async (body) => {
  try {
    const payload = body?.data;
    if (!payload) throw new Error('Missing data object in request body');
    const { bookingReference, gygBookingReference, productId } = payload;

    if (!bookingReference || !gygBookingReference || !productId) throw new Error('Missing required fields');

    const booking = await GygBooking.findOne({ bookingReference, gygBookingReference, productId });
    if (!booking) throw new Error('Booking not found');
    if (booking.bookingStatus === 'cancelled') throw new Error('Booking is already cancelled');

    await GygBooking.findByIdAndUpdate(booking._id, { bookingStatus: 'cancelled', status: false });
    return { data: {} };
  } catch (error) {
    console.error('Service cancelBooking error:', error);
    throw error;
  }
};

// Get all bookings
const getAllGygBookings = async () => {
  try {
    const bookings = await GygBooking.find({}).sort({ createdAt: -1 });
    return bookings;
  } catch (error) {
    throw new Error('Error fetching bookings: ' + error.message);
  }
};

module.exports = {
  getAvailability,
  createReservation,
  createGYGAvailability,
  createGYGAvailabilityone,
  cancelReservation,
  createBooking,
  cancelBooking,
  getAllGygBookings
};
