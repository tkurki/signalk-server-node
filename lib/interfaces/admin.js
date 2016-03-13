/*
 * Copyright 2016 Signal K Team <info@signalk.org>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

var bodyParser = require('body-parser'),
    debug = require('debug')('signalk:interfaces:admin'),
    express = require('express'),
    fs = require('fs'),
    handlebars = require('handlebars'),
    merge = require('lodash').merge,
    uuid = require('node-uuid');

/* TODO: Move these into a configuration file */
var publicPath = __dirname + '/../../public';
var bowerPath = __dirname + '/../../bower_components';
var settingsFile = __dirname + '/../../settings/settings.json';
var logPath = __dirname + '/../../samples';

module.exports = function(app) {
  return {
    start: function() {
      app.use(bodyParser.json());
      app.use('/bower_components', express.static(bowerPath));
      app.use('/', express.static(bowerPath));

      app.get('/', index);
      app.get('/admin/uuid', getUUID);
      app.post('/admin', updateSettings);
    }
  }
};

function index(req, res, next) {
  // Select the correct option in the select box.
  // https://gist.github.com/TheFuzzball/6173ab951d8b1dc4602e
  handlebars.registerHelper("select", function(value, options) {
    return options.fn(this)
      .split('\n')
      .map(function(v) {
        var t = 'value="' + value + '"';
        return ! RegExp(t).test(v) ? v : v.replace(t, t + ' selected="selected"');
      })
      .join('\n');
  });

  var html = fs.readFileSync(publicPath + '/index.html', {encoding: 'utf8'});
  var template = handlebars.compile(html);
  var result = template({
    apps: getBowerComponents(),
    settings: getSettings(),
    log_files: getLogFiles()
  });
  res.send(result);
}

function getBowerComponents() {
  var bowerFiles = [];

  try {
    bowerFiles = fs.readdirSync(bowerPath);
  } catch (exception) {
    debug("No such directory:", bowerPath);
  }

  return bowerFiles.reduce(function(result, dir) {
    try {
      var componentBowerInfo = require(bowerPath + '/' + dir + '/bower.json');
      if (componentBowerInfo.keywords &&
        componentBowerInfo.keywords.indexOf('signalk-ui') >= 0) {
        return result.concat(componentBowerInfo);
      }
    } catch (exception) {
      debug("Unable to get bower info for " + dir);
    }
    return result;
  }, []);
}

function getLogFiles() {
  var logFiles = [];

  try {
    logFiles = fs.readdirSync(logPath);
  } catch (ex) {
    debug("No such directory:", logPath);
  }

  console.log(logPath);
  console.log(logFiles);

  var ret = logFiles.map(function(file) {
    return {filename: file};
  });

  console.log(ret);

  return ret;
}

function getUUID(req, res) {
  var response = uuid.v4().split('-');

  res.send({uuid: response});
}

function updateSettings(req, res) {
  var data = getSettings(),
      fd;

  merge(data, req.body);

  if(data.vessel && data.vessel.uuid) {
    if(undefined !== data.vessel.uuid.find(function(i) { return i.trim() === ''; })) {
      data.vessel.uuid = '';
    } else {
      data.vessel.uuid = 'urn:mrn:signalk:uuid:' + data.vessel.uuid.join('-');
    }
  }

  try {
    fs.open(settingsFile, 'w', (err, fd) => {
      fs.write(fd, JSON.stringify(data, null, 2) + '\n', 'utf8', (err, fd) => {
        if(err) {
          debug(err);
        }
        fs.close(fd, () => {
          res.send(data);
        });
      });
    });
  } catch (ex) {
    debug("Could not write " + settingsFile);
  }
}

function getSettings() {
  var data,
      fd;

  try {
    fd = fs.openSync(settingsFile, 'r');
    data = fs.readFileSync(fd, 'utf8');
  } catch (ex) {
    debug("Could not read " + settingsFile);
    return {};
  } finally {
    fs.close(fd);
  }

  try {
    data = JSON.parse(data);
  } catch (ex) {
    debug("Could not parse " + settingsFile);
    return {};
  }

  if(data.vessel && data.vessel.uuid) {
    data.vessel.uuid = data.vessel.uuid.split(':')[4].split('-');
  }

  return data;
}
