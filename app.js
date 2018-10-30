const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const mongoose = require("mongoose");

const indexRouter = require('./routes');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  const allowOrigin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With, Content-Type, X-Mail-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

//mongo connection
const dbconfig = {
  url: 'mongodb://test:test123@ds145573.mlab.com:45573',
  dbname: 'heroku_kbx0g42n'
}
const connOptions = {
  poolSize: 2,
  // ssl: true,
  keepAlive: 300000,
  connectTimeoutMS: 30000,
  autoReconnect: true,
  reconnectTries: 300000,
  reconnectInterval: 5000,
  useNewUrlParser: true,
  promiseLibrary: global.Promise
};
console.log(`${dbconfig.url}/${dbconfig.dbname}`);

mongoose.connect(`${dbconfig.url}/${dbconfig.dbname}`,{useNewUrlParser:true});

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
});

module.exports = app;
