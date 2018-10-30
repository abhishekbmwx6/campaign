'use strict';
const campaignModel = require('../schema/campaign');
const config = require('../config')
const moment = require("moment")
const mongoose = require("mongoose")
const __ = require("underscore")
const fetch = require("node-fetch")
const { ObjectId } = mongoose.Types
const { campaign, campaign_start_date, campaign_end_date, campaign_start_time, campaign_end_time } = config
class CampaignOperations {

  weekAndDay(datetime) {
    return new Promise((resolve, reject) => {
      try {
        const date = new Date(datetime)
        const days = ['sunday', 'monday', 'tuesday', 'wednesday',
          'thursday', 'friday', 'saturday']
        const prefixes = ['week1', 'week2', 'week3', 'week4', 'week5'];

        console.log(prefixes[0 | date.getDate() / 7] + ' ' + days[date.getDay()]);
        return resolve(campaign[prefixes[0 | date.getDate() / 7]][days[date.getDay()]])
      } catch (err) {
        return reject("Error while calculating point for a day")
      }
    })

  }

  checkCampaignDateTime(datetime) {
    return new Promise((resolve, reject) => {

      try {
        //check campain start data and end data
        const date = new Date(datetime)

        let currdate = moment(date).utcOffset('+5:30').format("YYYY-MM-DD")
        let currdateTime = moment(date).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
        let csd = moment.utc(campaign_start_date).utcOffset('+5:30').format("YYYY-MM-DD")
        let cst = moment.utc(`${currdate}T${campaign_start_time}Z`).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
        let ced = moment.utc(campaign_end_date).utcOffset('+5:30').format("YYYY-MM-DD")
        let cet = moment.utc(`${currdate}T${campaign_end_time}Z`).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")

        console.log(csd, ced, currdate, cst, cet, currdateTime)
        console.log(moment(currdate).isSameOrAfter(csd) && moment(currdate).isSameOrBefore(ced) && moment(currdateTime).isSameOrAfter(cst) && moment(currdateTime).isSameOrBefore(cet))
        if (moment(currdate).isSameOrAfter(csd) && moment(currdate).isSameOrBefore(ced) && moment(currdateTime).isSameOrAfter(cst) && moment(currdateTime).isSameOrBefore(cet)) {
          return resolve()
        } else {
          return reject(" session expires ")
        }
      } catch (err) {
        return reject(err)
      }
    })
  }

  getSum(total, num) {
    return total + num;
  }

  sendMessage(who, message) {
    let url = `http://sms.webozindia.in/api/v3/?method=sms&api_key=A77821e3a8091a31ab3110383cbc48666&to=91${who}&sender=WOISOL&message=${encodeURIComponent(message)}`
    console.log(url)
    return fetch(url)
      .then(res => res.text())
      .then(body => { console.log(body); return true })
      .catch(err => {
        throw err
      })
  }

  async addPoints(data) {
    /**
     * Need to add logic for one time point in a day else 0 point should be added and point calculation  
     * */

    console.log(data)

    const { who, channalid, circle, operator, datetime } = data
    const date = new Date(datetime)
    try {
      await this.checkCampaignDateTime(datetime)

      let points = await this.weekAndDay(datetime)

      //check user

      let User = await campaignModel.findOne({ who }).lean()

      if (!(User && Object.keys(User).length)) {
        console.log("!!!!!New User!!!!!!!")
        //not present

        //add in campaign database
        let userData = {
          who,
          channel_id: channalid,
          circle,
          operator,
          call_logs: [
            {
              points,
              call_date: moment(date).utcOffset('+5:30').format("YYYY-MM-DD"),
              call_time: moment(date).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
            }
          ]
        }

        await campaignModel.create(userData)
        let resposeMessage = "you have given the right answer. your points are now " + points
        await this.sendMessage(who, resposeMessage)
        return resposeMessage
      }

      console.log("!!!!!Old User!!!!!!!")
      //presnt
      let resposeMessage = null
      let todaysPointIndex = __.findIndex(User.call_logs, { "call_date": moment(date).utcOffset('+5:30').format("YYYY-MM-DD") })
      if (todaysPointIndex >= 0) {
        points = 0
        resposeMessage = `the points are already allocated for the number ${who}. you can come back next day to participate again`
      }

      //update campaing database
      User.call_logs.push({
        points,
        call_date: moment(date).utcOffset('+5:30').format("YYYY-MM-DD"),
        call_time: moment(date).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
      })

      await campaignModel.updateOne({ _id: ObjectId(User._id) }, { $set: { call_logs: User.call_logs } })
      let finalPoints = __.pluck(User.call_logs, 'points')
      console.log(finalPoints)
      let totalPoints = finalPoints.reduce(this.getSum)
      resposeMessage = resposeMessage === null ? "you have given the right answer. your points are now " + totalPoints : resposeMessage

      await this.sendMessage(who, resposeMessage)
      return resposeMessage
    } catch (err) {
      console.log(err)
      throw err
    }
  }

}

module.exports = CampaignOperations;