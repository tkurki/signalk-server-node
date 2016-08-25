/*
 * Copyright 2016 Teppo Kurki <teppo.kurki@iki.fi>
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


const influx = require('influx')
const camelCase = require('camelcase');

var client = influx({
  host: 'localhost',
  port: 8086, // optional, default 8086
  protocol: 'http', // optional, default 'http'
  database: 'cassiopeia'
})

function handleDelta(delta) {
  if (delta.updates) {
    delta.updates.forEach(update => {
      if (update.values) {
        var series = {}
        update.values.forEach(pathValue => {
          if (typeof pathValue.value === 'number') {
            const seriesName = camelCase(pathValue.path)
            series[seriesName] = [
              [{
                value: pathValue.value
              }]
            ]
          }
        })
        client.writeSeries(series, function(err, response) {
          if (err) {
            console.error(err)
            console.error(response)
          }
        })
      }
    })
  }
}

module.exports = function(app) {
  return {
    start: function() {
      app.signalk.on('delta', handleDelta)
    },
    stop: function() {
      app.signalk.removeListener('delta', handleDelta)
    }
  }
}
