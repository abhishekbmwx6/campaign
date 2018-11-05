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
    let url = `http://sms.webozindia.in/api/v3/?method=sms&api_key=Af5380d9781b89658221773264b47bf1e&to=91${who}&sender=ZANMOL&unicode=auto&message=${encodeURIComponent(message)}`
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

    let { who, channalid, circle, operator, datetime } = data

    let datetimeArray = datetime.split(" ")
    let newDate = datetimeArray[0].split("-")

    datetime = `${newDate[2]}-${newDate[1]}-${newDate[0]} ${datetimeArray[1]}`

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
          totalPoints: points,
          call_logs: [
            {
              points,
              call_date: moment(date).utcOffset('+5:30').format("YYYY-MM-DD"),
              call_time: moment(date).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
            }
          ]
        }

        let res = await campaignModel.create(userData)
        let resposeMessage = `ज़ी अनमोल दिवाली इनामोंवाली प्रतियोगिता में आज आपने जीते हैं ${points} पॉइंट्स अब तक आपके कुल पॉइंट्स हैं ${points}`
        await this.sendMessage(who, resposeMessage)
        return resposeMessage
      }

      console.log("!!!!!Old User!!!!!!!")
      //presnt
      let resposeMessage = null
      let sendSMS = true
      let todaysPointArray = __.where(User.call_logs, { "call_date": moment(date).utcOffset('+5:30').format("YYYY-MM-DD") })
      console.log(" total hits : ", todaysPointArray.length)
      if (todaysPointArray.length == 1) {
        points = 0
        resposeMessage = `प्रतियोगिता के आज के पॉइंट्स आप प्राप्त कर चुके हैं कल फिर से प्रतियोगिता में भाग लीजिये और पॉइंट्स जीतिए`
      } else if (todaysPointArray.length > 1) {
        sendSMS = false
        points = 0
        resposeMessage = `प्रतियोगिता के आज के पॉइंट्स आप प्राप्त कर चुके हैं कल फिर से प्रतियोगिता में भाग लीजिये और पॉइंट्स जीतिए`
      }
      console.log(" send SMS ", sendSMS)
      //update campaing database
      User.call_logs.push({
        points,
        call_date: moment(date).utcOffset('+5:30').format("YYYY-MM-DD"),
        call_time: moment(date).utcOffset('+5:30').format("YYYY-MM-DD HH:mm:ss")
      })

      let finalPoints = __.pluck(User.call_logs, 'points')
      console.log(finalPoints)
      let totalPoints = finalPoints.reduce(this.getSum)

      await campaignModel.updateOne({ _id: ObjectId(User._id) }, { $set: { totalPoints, call_logs: User.call_logs } })

      resposeMessage = resposeMessage === null ? `ज़ी अनमोल दिवाली इनामोंवाली प्रतियोगिता में आज आपने जीते हैं ${points} पॉइंट्स अब तक आपके कुल पॉइंट्स हैं ${totalPoints}` : resposeMessage

      if (sendSMS) {
        await this.sendMessage(who, resposeMessage)
      }
      return resposeMessage
    } catch (err) {
      console.log(err)
      throw err
    }
  }

  getLatestPointsFromLogs(call_logs) {
    let result = {}
    for (let i = call_logs.length - 1; i >= 0; i--) {
      if (call_logs[i].points > 0) {
        result = { lastAnswerDate: call_logs[i].call_time, lastAnswerPoints: call_logs[i].points }
        break;
      }
    }
    return result
  }

  async report(data) {
    try {

      let query = { updatedAt: { $gte: new Date(data.fromdate).toISOString(), $lt: new Date(data.todate).toISOString() } }
      let result = await campaignModel.find(query).lean()
      if (!(result && result.length)) {
        throw new Error("No data found!")
      }

      let finalJson = []
      let count = 0
      result.map(res => {
        count++
        let { call_logs } = res
        let lastAnswerDate = call_logs[call_logs.length - 1].call_time;
        let logresult = this.getLatestPointsFromLogs(call_logs)
        let lastCorrectAnswerDate = logresult.lastAnswerDate;
        let lastAnswerPoints = logresult.lastAnswerPoints
        finalJson.push({ "sr_no": count, contact: res.who, circle: res.circle, operator: res.operator, lastCorrectAnswerDate, lastAnswerDate, lastAnswerPoints, totalPoints: res.totalPoints })
      })

      return finalJson
    } catch (err) {
      console.log("Final error in report model : ", err)
      throw err
    }
  }

}

module.exports = CampaignOperations;