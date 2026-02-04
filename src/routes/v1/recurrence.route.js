const express = require('express');


const recurrenceController = require('../../controllers/recurrence.controller.js');

const router = express.Router();

router.post('/', recurrenceController.createRecurrence);
// router.put('/:id', recurrenceController.updateRecurrence);
router.put('/sync/:syncId', recurrenceController.updateRecurrence);
router.delete("/sync/:syncId",recurrenceController.deleteRecurrenceBySyncId);
router.get('/sync/:syncId', recurrenceController.getRecurrenceBySyncId);
router.get('/:id', recurrenceController.getRecurrenceBy);
router.get('',recurrenceController.getAllRecurrence);
router.delete('/:id', recurrenceController.deleteRecurrence);
router.delete('/product/:productId', recurrenceController.deleteRecurrenceByProductId);
router.get('/product/:productId',recurrenceController.getRecurrenceByProductId);


module.exports = router;
