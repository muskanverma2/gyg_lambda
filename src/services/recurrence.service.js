const {Recurrence} = require('../models');


const createRecurrence = async (data) => {
    try {
        const recurrence = await Recurrence.create(data);
        console.log('Successfully created Recurrence');
        return recurrence;
    } catch (error) {
        console.log('Error in createRecurrence:', error.message);
        throw new Error(error.message);
    }
};



const updateRecurrenceBySyncId = async (
  syncId,
  updateData,
  options = { new: true }
) => {
  const recurrence = await Recurrence.findOneAndUpdate(
    { syncId },
    updateData,
    options
  );

  if (!recurrence) {
    throw new Error("Recurrence not found");
  }

  return recurrence;
};

const getRecurrenceById = async (id) => {
    try {
        const recurrence = await Recurrence.findById(id).lean();
        if (!recurrence) {
            throw new Error('Recurrence not found');
        }
        return recurrence;
    } catch (error) {
        throw new Error(error.message);
    }
};


const getAllRecurrences = async () => {
    try {
        const recurrences = await Recurrence.find({ status: true }).lean();
        return recurrences;
    } catch (error) {
        throw new Error(error.message);
    }
};


const deleteRecurrenceById = async (id) => {
    try {
        const recurrence = await Recurrence.findById(id);
        if (!recurrence) {
            throw new Error('Recurrence not found');
        }
        recurrence.status = false;
        await recurrence.save();
        await Availability.updateMany(
            { recurrenceRuleIds: id },
            { status: false }
        );

        return recurrence;
    } catch (error) {
        throw new Error(error.message);
    }
};


const deleteRecurrenceByProductId = async (productId) => {
    try {
        const result = await Recurrence.deleteMany({ productId });
        return result.deletedCount; // Number of documents deleted
    } catch (error) {
        console.error('Error in recurrenceService:', error);
        throw error;
    }
};



// const getRecurrenceByProductId = async (productId, fromDateTime) => {
//   try {
//     if (!fromDateTime) throw new Error("Missing fromDateTime");

//     // Extract only the date part (YYYY-MM-DD) from payload
//     const queryDate = fromDateTime.split('T')[0]; // "2025-03-27"

//     // Match string in DB starting with this date
//     const recurrences = await Recurrence.find({
//       productId,
//       status: true,
//       startDate: { $regex: `^${queryDate}` } // matches "2025-03-27T..."
//     }).lean();

//     return recurrences; // empty array if no match
//   } catch (error) {
//     throw new Error(error.message);
//   }
// };


const getRecurrenceByProductId = async (
  productId,
  fromDateTime,
  toDateTime
) => {
  try {
    if (!fromDateTime || !toDateTime) {
      throw new Error("Missing date range");
    }

    const fromDate = fromDateTime.split('T')[0];
    const toDate   = toDateTime.split('T')[0];

    const recurrences = await Recurrence.find({
      productId,
      status: true,
      startDate: { $lte: `${fromDate}T23:59:59.999Z` },
      endDate:   { $gte: `${toDate}T00:00:00.000Z` }
    }).lean();

    return recurrences;
  } catch (error) {
    throw new Error(error.message);
  }
};


const getRecurrenceBySyncId = async (syncId) => {
  try {
    const recurrence = await Recurrence.findOne({ syncId });

    return recurrence;
  } catch (error) {
    console.error("Service error: getRecurrenceBySyncId", error);
    throw new Error("Failed to fetch recurrence by syncId");
  }
};

const deleteRecurrenceBySyncId = async (syncId) => {
  try {
    const recurrence = await Recurrence.findOneAndDelete({ syncId });

    if (!recurrence) {
      throw new Error("Recurrence not found");
    }

    return recurrence;
  } catch (error) {
    console.error("Service deleteRecurrenceBySyncId error:", error);
    throw error; 
  }
};



module.exports = {
    createRecurrence,
    // updateRecurrenceById,
    getRecurrenceById,
    getAllRecurrences,
    deleteRecurrenceById,
    deleteRecurrenceByProductId,
    getRecurrenceByProductId,
    updateRecurrenceBySyncId,
    getRecurrenceBySyncId,
    deleteRecurrenceBySyncId
};
