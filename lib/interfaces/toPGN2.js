const Bacon = require('baconjs');
const toPgn = require('to-n2k').toPgn


module.exports = function(app) {
  var api = {
    unsubscribes: []
  };

  api.start = function() {
    //TODO figure out how to start streamBundle before other interfaces
    //and get rid of the delay
    setTimeout(_ => {
      function mapToPgn(mapping) {
        return Bacon.combineWith(mapping.f, mapping.keys.map(app.streamBundle.getStream, app.streamBundle))
          .changes()
          .debounceImmediate(20)
          .map(toPgn)
          .onValue(pgnBuffer => {
            app.emit('pgnout', toActisenseSerialFormat(mapping.pgn, pgnBuffer))
          });
      }

      app.on('pgnout', _ => console.log(_))

      mappings.forEach(mapping => {
        api.unsubscribes.push(mapToPgn(mapping));
      })
    }, 50)
  }

  api.stop = function() {
    api.unsubscribes.forEach(f => f())
  };

  return api;
};


var toActisenseSerialFormat = function(pgn, data) {
  return "1970-01-01T00:00:00.000,4," + pgn + ",43,255," + data.length + "," +
    new Uint32Array(data).reduce(function(acc, i) {
      acc.push(i.toString(16));
      return acc;
    }, []).map(x => x.length === 1 ? '0' + x : x).join(',')
}


const mappings = [{
  pgn: 127250,
  keys: [
    'navigation.headingMagnetic'
    // 'navigation.magneticVariation'
  ],
  f: (heading, variation) => {
    return {
      "pgn": 127250,
      "SID": 87,
      "Heading": heading,
      // "Variation": variation,
      "Reference": "Magnetic"
    }
  }
}]
