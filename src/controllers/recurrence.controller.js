const { recurrenceService} = require('../services');
const { parse, addHours, format } = require('date-fns');
const moment = require('moment');
const { Worker } = require('worker_threads');
const {Recurrence} = require('../models');
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
// Optional cross-system sync target (recommended to set via env in Lambda)
// If you don't set MYSQL_BASE_URL, Mongo will NOT try to sync to MySQL.
const MYSQL_BASE_URL = process.env.MYSQL_BASE_URL;



const getWeekdayIndex = (weekdayName) => {
    const date = new Date();
    const weekdays = [];
    for (let i = 0; i < 7; i++) {
        date.setDate(date.getDate() - date.getDay() + i);
        const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date).slice(0, 2);
        weekdays.push(weekday);
    }
    return weekdays.indexOf(weekdayName);
};

function getWeekdayName(dayIndex) {
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    return days[dayIndex];
}

const createRecurrence = async (req, res) => {
  try {
    const data = req.body;

    if (!data.syncId) data.syncId = require("uuid").v4();

    const recurrence = await createAvailabilityForRecurrence(data);
    const availabilities = recurrence.availabilities || [];

    const syncSource = req.headers["x-sync-source"] || "mongo";
    const mysqlSyncEnabled = Boolean(MYSQL_BASE_URL);
    const shouldSyncToMysql = mysqlSyncEnabled && syncSource !== "mysql" && recurrence.syncId;

    if (shouldSyncToMysql) {
      try {
        await axios.post(
          MYSQL_BASE_URL,
          {
            ...data,
            mongoRecurrenceId: recurrence._id,
            availabilities: availabilities,
            syncId: recurrence.syncId, 
            _id: undefined, 
          },
          { headers: { "x-sync-source": "mongo" } }
        );

        console.log("✅ Recurrence + Availability synced to MySQL successfully");
      } catch (mysqlErr) {
        console.error(
          "❌ MySQL sync error (recurrence create):",
          mysqlErr.response?.data || mysqlErr.message
        );
      }
    }
    return res.status(201).json({
      success: true,
      message: "Recurrence and availability created successfully",
      data: { recurrence, availabilities },
    });
  } catch (error) {
    console.error("Error in createRecurrence:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const createAvailabilityForRecurrence = async (data) => {
  const times = Array.isArray(data.times) ? data.times : [];
  let availabilities = [];
  const { bom, appliesToAllStartTimes, affectedStartTimes } = data;

  if (["FIXED_DATE", "DATE_RANGE"].includes(data.type)) {
    const startDate = bom?.dtStart ? new Date(bom.dtStart) : new Date();
    const endDate = data.type === "DATE_RANGE" && bom?.until ? new Date(bom.until) : startDate;

    const targetWeekdays = Array.isArray(bom.byWeekday)
      ? bom.byWeekday.map((d) => getWeekdayIndex(d))
      : null;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (!targetWeekdays || targetWeekdays.includes(d.getDay())) {
        if (appliesToAllStartTimes) {
          times.forEach((timeSlot) => {
            const slot = createAvailabilityForTimeSlot(timeSlot, d, data);
            if (slot) availabilities.push(slot);
          });
        } else {
          affectedStartTimes.forEach((startTimeId) => {
            const slot = times.find((t) => t.id === startTimeId);
            if (slot) {
              const obj = createAvailabilityForTimeSlot(slot, d, data);
              if (obj) availabilities.push(obj);
            }
          });
        }
      }
    }
  }


  else if (data.type === "WEEKLY") {
    const startDate = bom?.dtStart ? new Date(bom.dtStart) : new Date();
    const endDate = bom?.until ? new Date(bom.until) : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    endDate.setHours(23, 59, 59, 999);

    const targetWeekdays = Array.isArray(bom.byWeekday)
      ? bom.byWeekday.map((d) => getWeekdayIndex(d))
      : [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (targetWeekdays.includes(d.getDay())) {
        if (appliesToAllStartTimes) {
          times.forEach((timeSlot) => {
            const slot = createAvailabilityForTimeSlot(timeSlot, d, data);
            if (slot) availabilities.push(slot);
          });
        } else {
          affectedStartTimes.forEach((startTimeId) => {
            const slot = times.find((t) => t.id === startTimeId);
            if (slot) {
              const obj = createAvailabilityForTimeSlot(slot, d, data);
              if (obj) availabilities.push(obj);
            }
          });
        }
      }
    }
  }

  else if (data.type === "MONTHLY") {
    const currentYear = new Date().getFullYear();
    const yearsToProcess = [currentYear, currentYear + 1];

    const monthsToProcess = (bom.byMonth || []).map(({ value }) =>
      new Date(Date.parse(`${value} 1, ${currentYear}`)).getMonth()
    );
    const targetWeekdays = (bom.byWeekday || []).map((d) => getWeekdayIndex(d));

    yearsToProcess.forEach((year) => {
      monthsToProcess.forEach((monthIndex) => {
        const firstDayOfMonth = new Date(year, monthIndex, 1);
        const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

        for (let currentDate = new Date(firstDayOfMonth); currentDate <= lastDayOfMonth; currentDate.setDate(currentDate.getDate() + 1)) {
          if (targetWeekdays.includes(currentDate.getDay())) {
            if (appliesToAllStartTimes) {
              times.forEach((timeSlot) => {
                const slot = createAvailabilityForTimeSlot(timeSlot, currentDate, data);
                if (slot) availabilities.push(slot);
              });
            } else {
              affectedStartTimes.forEach((startTimeId) => {
                const slot = times.find((t) => t.id === startTimeId);
                if (slot) {
                  const obj = createAvailabilityForTimeSlot(slot, currentDate, data);
                  if (obj) availabilities.push(obj);
                }
              });
            }
          }
        }
      });
    });
  }


  availabilities = availabilities.filter((item) => item !== null);


  const recurrence = new Recurrence({ ...data, availabilities });
  await recurrence.save();

  return recurrence;
};


const createAvailabilityForTimeSlot = (timeSlot, date, data) => {
  if (!date) return null;
  let startTime = null;
  let duration = null;

  if (typeof timeSlot === "object" && timeSlot !== null) {
    startTime =
      timeSlot.startTime ||
      timeSlot.start ||
      timeSlot.time ||
      null;

    duration = timeSlot.duration ?? 1;

    if (!startTime && timeSlot.label) {
      const parts = timeSlot.label.split("-");
      startTime = parts[0]?.trim() || null;
    }
  }

  if (!startTime) return null;

  const endTime = calculateEndTime(startTime, duration);
  const formattedStartTime = formatTime(startTime);
  const formattedEndTime = formatTime(endTime);

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return null;

  const datePart = dateObj.toISOString().split("T")[0];

  const startDateAndTime = moment(datePart)
    .set({
      hour: parseInt(formattedStartTime.split(":")[0], 10),
      minute: parseInt(formattedStartTime.split(":")[1], 10),
      second: 0,
      millisecond: 0,
    })
    .toISOString();

  const endDateAndTime = moment(datePart)
    .set({
      hour: parseInt(formattedEndTime.split(":")[0], 10),
      minute: parseInt(formattedEndTime.split(":")[1], 10),
      second: 0,
      millisecond: 0,
    })
    .toISOString();

  return {
    startTime: formattedStartTime,
    time: {
      startTime: formattedStartTime,
      endTime: formattedEndTime,
    },
    date: dateObj.toISOString(),
    productId: data.productId,
    recurrenceRuleIds: data.recurrenceId,
    dateAndTime: {
      startDateAndTime,
      endDateAndTime,
    },
    color: data.color,
    minTotalPax: data.minTotalPax,
    maxCapacity: data.maxCapacity,
    maxCapacityForPickup: data.maxCapacityForPickup,
  };
};


const formatTime = (time) => {
  if (!time) return null;

  if (typeof time === "string" && time.includes("-")) {
    time = time.split("-")[0].trim();
  }

  const parsed = parse(time.trim(), ["HH:mm", "H:mm"], new Date());
  if (isNaN(parsed.getTime())) return null;

  return format(parsed, "HH:mm");
};

const calculateEndTime = (startTime, duration = 1) => {
  if (!startTime) return null;

  const parsedStartTime = parse(
    startTime.trim(),
    ["HH:mm", "H:mm"],
    new Date()
  );

  if (isNaN(parsedStartTime.getTime())) return null;

  return format(addHours(parsedStartTime, duration), "HH:mm");
};




// const updateRecurrence = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { _id, ...updateData } = req.body; // ignore client _id

//     // 1️⃣ Fetch existing recurrence
//     const existingRecurrence = await recurrenceService.getRecurrenceById(id);
//     if (!existingRecurrence) {
//       return res.status(404).json({
//         success: false,
//         message: "Recurrence not found",
//       });
//     }

//     // 2️⃣ Ensure syncId exists for future syncing
//     if (!existingRecurrence.syncId) {
//       existingRecurrence.syncId = require("uuid").v4();
//       await existingRecurrence.save();
//     }

//     // 3️⃣ Update recurrence in Mongo
//     const updatedRecurrence = await recurrenceService.updateRecurrenceById(
//       id,
//       updateData,
//       { new: true }
//     );

//     const updatedPayload =
//       typeof updatedRecurrence.toObject === "function"
//         ? updatedRecurrence.toObject()
//         : updatedRecurrence;

//     // 4️⃣ Sync Mongo → MySQL (avoid infinite loop)
//     const syncSource = req.headers["x-sync-source"] || "mongo"; // default to mongo
//     console.log("Mongo update - syncSource:", syncSource);

//     if (syncSource !== "mysql" && updatedPayload.syncId) {
//       try {
//         await axios.put(
//           `${MYSQL_BASE_URL}/${updatedPayload.syncId}`, // use syncId for MySQL
//           {
//             ...updatedPayload,
//             mongoRecurrenceId: updatedPayload._id,
//             _id: undefined, // never send Mongo _id
//           },
//           { headers: { "x-sync-source": "mongo" } }
//         );

//         console.log("✅ Mongo → MySQL recurrence synced");
//       } catch (mysqlErr) {
//         console.error(
//           "❌ MySQL sync error (recurrence update):",
//           mysqlErr.response?.data || mysqlErr.message
//         );
//       }
//     } else {
//       console.log("Skipping Mongo → MySQL sync (no syncId or request came from MySQL)");
//     }

//     // 5️⃣ Return response
//     return res.status(200).json({
//       success: true,
//       message: "Recurrence updated successfully",
//       data: updatedPayload,
//     });
//   } catch (error) {
//     console.error("Update recurrence error:", error);
//     return res.status(400).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



const updateRecurrence = async (req, res) => {
  try {
    const { syncId } = req.params;
    const { _id, ...updateData } = req.body; 


    const existingRecurrence =
      await recurrenceService.getRecurrenceBySyncId(syncId);

    if (!existingRecurrence) {
      return res.status(404).json({
        success: false,
        message: "Recurrence not found",
      });
    }


    if (!existingRecurrence.syncId) {
      existingRecurrence.syncId = uuidv4();
      await existingRecurrence.save();
    }


    const updatedRecurrence =
      await recurrenceService.updateRecurrenceBySyncId(
        existingRecurrence.syncId,
        updateData,
        { new: true }
      );

    const updatedPayload = updatedRecurrence.toObject();

  
    const syncSource = req.headers["x-sync-source"] || "mongo";

    if (syncSource !== "mysql" && updatedPayload.syncId) {
      try {

        const {
          _id,
          index,        
          id,           
          createdAt,   
          updatedAt,   
          __v,         
          ...safePayload
        } = updatedPayload;

        await axios.put(
          `${MYSQL_BASE_URL}/sync/${updatedPayload.syncId}`,
          {
            ...safePayload,
            mongoRecurrenceId: _id,
          },
          {
            headers: { "x-sync-source": "mongo" },
          }
        );

        console.log("✅ Mongo → MySQL recurrence synced safely");
      } catch (err) {
        console.error(
          "❌ MySQL sync error:",
          err.response?.data || err.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Recurrence updated successfully",
      data: updatedPayload,
    });
  } catch (error) {
    console.error("Update recurrence error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



const getRecurrenceBy = async (req, res) => {
    try {
        const recurrence = await recurrenceService.getRecurrenceById(req.params.id);
        return res.status(200).json({ success: true, message: 'Recurrence fetched successfully', data: recurrence });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message });
    }
};

const getAllRecurrence = async (req, res) => {
    try {
        const recurrences = await recurrenceService.getAllRecurrences();
        return res.status(200).json({ success: true, message: 'All recurrences fetched successfully', data: recurrences });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteRecurrence = async (req, res) => {
  try {
    const { id } = req.params;

    const recurrence = await recurrenceService.getRecurrenceById(id);
    if (!recurrence) {
      return res.status(404).json({
        success: false,
        message: "Recurrence not found",
      });
    }

 
    const result = await recurrenceService.deleteRecurrenceById(id);


    const syncSource = req.headers["x-sync-source"];

    if (syncSource !== "mysql") {
      try {
        await axios.delete(
          `${MYSQL_BASE_URL}/${recurrence.syncId}`,
          {
            headers: { "x-sync-source": "mongo" },
          }
        );

        console.log("🗑️ Recurrence deleted & synced to MySQL");
      } catch (mysqlErr) {
        console.error(
          "MySQL sync error (recurrence delete):",
          mysqlErr.response?.data || mysqlErr.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Recurrence deleted successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteRecurrenceByProductId = async (req, res) => {
    try {
        const result = await recurrenceService.deleteRecurrenceByProductId(req.params.productId);
        if (result) return res.status(200).json({ message: 'Recurrence data deleted successfully', deletedCount: result });
        return res.status(404).json({ message: 'No recurrence data found for the given product ID' });
    } catch (error) {
        return res.status(500).json({ message: 'An error occurred while deleting recurrence data', error: error.message });
    }
};

const getRecurrenceByProductId = async (req, res) => {
    try {
        const recurrence = await recurrenceService.getRecurrenceByProductId(req.params.productId);
        return res.status(200).json({ success: true, message: 'RecurrenceProductByProductId fetched successfully', data: recurrence });
    } catch (error) {
        return res.status(404).json({ success: false, message: error.message });
    }
};

const getRecurrenceBySyncId = async (req, res) => {
  try {
    const { syncId } = req.params;

    const recurrence =
      await recurrenceService.getRecurrenceBySyncId(syncId);

    if (!recurrence) {
      return res.status(404).json({
        success: false,
        message: "Recurrence not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Recurrence fetched successfully",
      data:
        typeof recurrence.toObject === "function"
          ? recurrence.toObject()
          : recurrence,
    });
  } catch (error) {
    console.error("Get recurrence error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


const deleteRecurrenceBySyncId = async (req, res) => {
  try {
    const { syncId } = req.params;
    const existingRecurrence =
      await recurrenceService.getRecurrenceBySyncId(syncId);

    if (!existingRecurrence) {
      return res.status(404).json({
        success: false,
        message: "Recurrence not found",
      });
    }
    const deletedRecurrence =
      await recurrenceService.deleteRecurrenceBySyncId(syncId);

    const deletedPayload =
      typeof deletedRecurrence.toObject === "function"
        ? deletedRecurrence.toObject()
        : deletedRecurrence;
    const syncSource = req.headers["x-sync-source"] || "mongo";

    if (syncSource !== "mysql" && deletedPayload.syncId) {
      try {
        await axios.delete(
          `${MYSQL_BASE_URL}/sync/${deletedPayload.syncId}`,
          {
            headers: { "x-sync-source": "mongo" },
          }
        );

        console.log("✅ Mongo → MySQL recurrence deleted safely");
      } catch (err) {
        console.error(
          "❌ MySQL delete sync error:",
          err.response?.data || err.message
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Recurrence deleted successfully",
      data: deletedPayload,
    });
  } catch (error) {
    console.error("Delete recurrence error:", error);
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};



module.exports = {
    createRecurrence,
    updateRecurrence,
    getRecurrenceBy,
    getAllRecurrence,
    deleteRecurrence,
    createAvailabilityForTimeSlot,
    calculateEndTime,
    createAvailabilityForRecurrence,
    deleteRecurrenceByProductId,
    getRecurrenceByProductId,
    getRecurrenceBySyncId,
    deleteRecurrenceBySyncId
};
