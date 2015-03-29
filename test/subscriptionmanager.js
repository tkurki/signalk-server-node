var debug = require('debug')('signalk:subscriptionmanager:test');
var _ = require('lodash');


var chai = require("chai");
chai.Should();

var SubscriptionManager = require('../lib/subscriptionmanager');

var assert = require("assert")

var apparentWindSpeed = require('./data/apparentWind');
var variation = require('./data/variation');
var depth = require('./data/depth');
var stw1 = require('./data/stw1');
var stw2 = require('./data/stw2');
var stw3 = require('./data/stw3');
var current = require('./data/current');

var emptySubscription = {
  "context": "vessels.self",
  "subscribe": []
};

var emptyDelta = {
  "context": "vessels.self",
  "updates": []
};

function TestEmitter() {}
var EventEmitter = require('events').EventEmitter;
require('util').inherits(TestEmitter, EventEmitter);

TestEmitter.prototype.push = function(data) {
  this.emit('change:delta', data);
}


describe('Without subscriptions', function() {
  it('Only heartbeat received', function(done) {
    var testEmitter = new TestEmitter();
    var subscriptionManager = new SubscriptionManager(testEmitter);
    var result = [];
    subscriptionManager.handleCommand("emptyid", emptySubscription, function(data) {
      result.push(data);
    });
    testEmitter.push(apparentWindSpeed);
    setTimeout(function() {
      result.length.should.equal(1);
      result[0].should.deep.equal(emptyDelta);
      done();
    }, 1500);
  })
});


function withSubscriptions(subscriptions) {
  var testEmitter = new TestEmitter();
  var subscriptionManager = new SubscriptionManager(testEmitter);
  var result = [];
  var callback = function(data) {
    result.push(data);
  }
  subscriptions.forEach(function(subcription) {
    subscriptionManager.handleCommand("emptyid", subcription, callback);
  });
  return {
    withInputSignalK: function(signalks, delay, done) {
      var count = 0;
      signalks.forEach(function(signalk, i) {
        if (delay) {
          setTimeout(function() {
            testEmitter.push(signalk);
            if (++count === signalks.length) {
              done(result);
            }
          }, delay * i);
        } else {
          testEmitter.push(signalk);
        }
      })
      return {
        assertSignalkSequence: function(sequence) {
          assertSequencesAreEqual(result, sequence);
        }
      }
    }
  }
}

function assertSequencesAreEqual(sequence1, sequence2) {
  sequence1.length.should.equal(sequence2.length, 'Sequence lengths are equal');
  for (i = 0; i < sequence1.length; i += 1) {
    assert(_.isEqual(sequence1[i], sequence2[i]), "Elements [" + i + "] are equal, got " + JSON.stringify(sequence1[i], null, 2) + "  " + JSON.stringify(sequence2[i], null, 2));
  }
}


var selfSubscriptionWithDepthAndSpeed = {
  "context": "vessels.self",
  "subscribe": [{
    "path": "environment.depth.belowTransducer",
  }, {
    "path": "navigation.speedThroughWater",
  }],
}
describe('With simple self subscription', function() {
  it('Correct sequence received', function() {
    withSubscriptions([selfSubscriptionWithDepthAndSpeed])
      .withInputSignalK([stw1, current, stw2, depth].map(cloneWithContext('vessels.self')))
      .assertSignalkSequence([stw1, stw2, depth].map(cloneWithContext('vessels.self')));
  })
});

var vesselPositionsAndStwsOver3G = {
  "context": "vessels.*",
  "subscribe": [{
    "path": "navigation.position",
    "minPeriod": 100,
    "format": "full",
    "policy": "fixed"
  }, {
    "path": "navigation.speedThroughWater",
    "minPeriod": 100,
    "format": "full",
    "policy": "fixed"
  }]
}

function cloneWithContext(context) {
  return function(delta) {
    var clone = _.clone(delta, true);
    clone.context = context;
    return clone;
  }
}

describe('With period subscription', function() {
  it('Correct sequence received', function(done) {
    this.timeout(4000);
    withSubscriptions([vesselPositionsAndStwsOver3G])
      .withInputSignalK([stw1, stw2, current, depth, stw3].map(cloneWithContext('vessels.self')), 50, function(resultSequence) {
        assertSequencesAreEqual(resultSequence, [stw1, stw3].map(cloneWithContext('vessels.self')));
        done();
      });
  });
});

describe('With multiple subscriptions', function() {
  it('Correct sequence received', function(done) {
    this.timeout(4000);
    var testEmitter = new TestEmitter();
    var subscriptionManager = new SubscriptionManager(testEmitter);
    var emitDelta = testEmitter.emit.bind(testEmitter, 'change:delta');
    var signalKs = [stw1].map(cloneWithContext('vessels.self'));
    var result1 = [];
    var result2 = [];
    var result3 = [];

    subscriptionManager.handleCommand("id1", selfSubscriptionWithDepthAndSpeed, result1.push.bind(result1));
    subscriptionManager.handleCommand("id2", selfSubscriptionWithDepthAndSpeed, result2.push.bind(result2));
    subscriptionManager.handleCommand("id3", selfSubscriptionWithDepthAndSpeed, result3.push.bind(result3));

    signalKs.forEach(emitDelta);
    result1.length.should.equal(1);
    result2.length.should.equal(1);
    result3.length.should.equal(1);

    subscriptionManager.removeSubscriptions("id2");
    signalKs.forEach(emitDelta);
    result1.length.should.equal(2);
    result2.length.should.equal(1);
    result3.length.should.equal(2);

    subscriptionManager.removeSubscriptions("id3");
    signalKs.forEach(emitDelta);
    result1.length.should.equal(3);
    result2.length.should.equal(1);
    result3.length.should.equal(2);

    subscriptionManager.handleCommand("id3", selfSubscriptionWithDepthAndSpeed, result3.push.bind(result3));
    signalKs.forEach(emitDelta);
    result1.length.should.equal(4);
    result2.length.should.equal(1);
    result3.length.should.equal(3);

    done();
  })
});