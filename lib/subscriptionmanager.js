var debug = require('debug')('signalk:subscriptionmanager');
var _ = require('lodash');
var bacon = require('baconjs');


var emptyDelta = {
  "context": "vessels.self",
  "updates": []
};


function SubscriptionManager(signalkEmitter) {
  this.subscriptionHolders = {};

  var that = this;
  setInterval(function() {
    _.values(that.subscriptionHolders).forEach(function(subscriptionHolder) {
      if (subscriptionHolder.heartbeat) {
        subscriptionHolder.heartbeat(emptyDelta);
      }
    })
  }, 1000);
  signalkEmitter.on("change:delta", function(delta) {
    _.values(that.subscriptionHolders).forEach(function(subscriptionHolder) {
      debug("Holder:" + JSON.stringify(subscriptionHolder))
      if (subscriptionHolder.subscriptions) {
        subscriptionHolder.subscriptions.forEach(function(subscription) {
          if (subscription.contextMatches(delta.context)) {
            delta.updates[0].values.forEach(function(pathValue) {
              subscription.pathSubscriptions.forEach(function(subsPathValue) {
                if (pathValue.path === subsPathValue.path) {
                  subsPathValue.callback(delta);
                }
              });
            });
          }
        })
      }
    })
  })
}

SubscriptionManager.prototype.handleCommand = function(id, command, callback) {
  debug(id)
  debug("holders:" + JSON.stringify(this.subscriptionHolders))
  if (_.isArray(command.subscribe) && command.subscribe.length === 0 && !this.subscriptionHolders[id]) {
    this.subscriptionHolders[id] = {
      heartbeat: callback
    };
  }
  if (_.isArray(command.subscribe) && command.subscribe.length > 0 && !this.subscriptionHolders[id]) {
    var subscriptionHolder = this.subscriptionHolders[id];
    if (!subscriptionHolder) {
      subscriptionHolder = {};
      this.subscriptionHolders[id] = subscriptionHolder;
    }
    subscriptionHolder.pausedHeartBeat = subscriptionHolder.heartbeat;
    delete subscriptionHolder.heartbeat;
    if (!subscriptionHolder.subscriptions) {
      subscriptionHolder.subscriptions = [];
    }
    subscriptionHolder.subscriptions.push({
      context: command.context,
      contextMatches: getContextMatcher(command.context),
      pathSubscriptions: command.subscribe.map(function(pathSubscription) {
        if (pathSubscription.minPeriod) {
          var bus = new bacon.Bus();
          bus.debounceImmediate(pathSubscription.minPeriod).onValue(callback);
          pathSubscription.callback = bus.push.bind(bus);
        } else {
          pathSubscription.callback = callback;
        }
        return pathSubscription
      })
    });
  }
  debug("holders:" + JSON.stringify(this.subscriptionHolders))
}


function getContextMatcher(subscriptionContext) {
  var matcherIndex = subscriptionContext.indexOf('.*');
  if (matcherIndex > 0) {
    var prefix = subscriptionContext.substring(0, matcherIndex);
    return function(context) {
      return context.indexOf(prefix) === 0;
    }
  } else {
    return function(context) {
      return context === subscriptionContext;
    }
  }
}

module.exports = SubscriptionManager;