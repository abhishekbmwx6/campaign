'use strict';
const router = require('express').Router();
const Joi = require('joi');
const { validate } = require('../helper/helper')
const CampaignOperations = require('../model/campaign');

router.get('/addpoints', (req, res) => {
  // validation schema
  const schema = Joi.object().keys({
    who: Joi.string().required(),
    channelid: Joi.string().required(),
    circle: Joi.string().required(),
    operator: Joi.string().required(),
    datetime: Joi.string()
  });

  const campaignOperations = new CampaignOperations();

  validate(req.query, schema)
    .then((result) => {
      console.log("validation success")
      return campaignOperations.addPoints(req.query)
    })
    .then(result => {
      let response = {
        statusCode: 0,
        message: "success",
        data: result,
        error: null
      }
      res.json(response)
    })
    .catch((err) => {
      console.log("controller error ", err)
      let response = {
        statusCode: 1,
        message: err.message,
        error: err
      }
      res.json(response)
    });

})




module.exports = router;