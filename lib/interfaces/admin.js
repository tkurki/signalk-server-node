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
    express = require('express'),
    fs = require('fs'),
    merge = require('lodash').merge,
    uuid = require('node-uuid');

module.exports = function(app) {
  return {
    start: function() {
      app.use(bodyParser.json());
      app.get('/admin/uuid', getUUID);
      app.post('/admin', updateSettings);
    }
  }
};

function getUUID(req, res) {
  var response = uuid.v4().split('-');

  res.send({uuid: response});
}

function updateSettings(req, res) {
  var settingsFile = __dirname + '/../../settings/settings.json';

  fs.open(settingsFile, 'r+', (err, fd) => {
    if(err) {
      fs.writeFile(settingsFile, JSON.stringify(req.body), (err) => {
        if(err) throw err;
      });
    } else {
      fs.readFile(fd, (err, data) => {
        if(err) throw err;
        var settings = JSON.parse(data);
        var newSettings = req.body;
        merge(settings, newSettings);
        fs.writeFile(fd, JSON.stringify(settings, null, 2) + '\n', (err) => {
          if(err) throw err;
          fs.close(fd);
          res.send(settings);
        });
      });
    }
  });
}
