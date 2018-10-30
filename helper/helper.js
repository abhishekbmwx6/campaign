const Joi = require('joi');

const validate = (data, schema) => {

  return new Promise((reslove, reject) => {
    Joi.validate(data, schema, (err, value) => {
      if (err) {
        console.log("validation error", err)
        reject(err)
      }
      reslove()
    });
  });
}

module.exports = { validate }