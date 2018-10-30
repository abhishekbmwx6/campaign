/* jshint node: true */
/* jshint esnext: true */
'use strict';
// load the things we need
const mongoose = require('mongoose')
// define the schema for campaign  model

const call_logsSchema = mongoose.Schema({
  call_time: { type: String, require: true },
  call_date: { type: String, require: true },
  points: { type: Number, require: true, default: true }
})

const campaignSchema = mongoose.Schema({
  who: { type: String, require: true },
  channel_id: { type: String, require: true },
  circle: { type: String, require: true },
  operator: { type: String, require: true },
  call_logs: [call_logsSchema]
}, {
    timestamps: true
  });

module.exports = mongoose.model('Campaign', campaignSchema);