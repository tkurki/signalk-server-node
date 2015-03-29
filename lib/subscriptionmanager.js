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
    _.forOwn(that.subscriptionHolders, function(subscriptionHolder, id) {
      debug(id + " holder:" + JSON.stringify(subscriptionHolder))
      if (subscriptionHolder.subscriptions) {
        subscriptionHolder.subscriptions.forEach(function(subscription) {
          if (subscription.contextMatches(delta.context)) {
            delta.updates[0].values.forEach(function(pathValue) {
              subscription.pathSubscriptions.forEach(function(pathSubscription) {
                if (pathValue.path === pathSubscription.path) {
                  pathSubscription.callback(delta);
                }
              });
            });
          }
        })
      }
    })
  })
}

var count = 0;

SubscriptionManager.prototype.handleCommand = function(id, command, callbackForCommand) {
  debug(id)
  debug("holders:" + JSON.stringify(this.subscriptionHolders))
  if (_.isArray(command.subscribe) && command.subscribe.length === 0 && !this.subscriptionHolders[id]) {
    this.subscriptionHolders[id] = {
      heartbeat: callbackForCommand
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
        var subscriptionWithCallBack = {
          path: pathSubscription.path,
          unsubscribe: function() {},
          callback: callbackForCommand,
          count: count++
        };
        if (pathSubscription.minPeriod) {
          var bus = new bacon.Bus();
          subscriptionWithCallBack.unsubscribe = bus.debounceImmediate(pathSubscription.minPeriod).onValue(callbackForCommand);
          subscriptionWithCallBack.callback = bus.push.bind(bus);
        }
        return subscriptionWithCallBack;
      })
    });
  }
  debug("holders:" + JSON.stringify(this.subscriptionHolders))
}

SubscriptionManager.prototype.removeSubscriptions = function(id) {
  debug("Removing subscriptions for " + id);
  var subscriptionCount = 0;
  var pathSubscriptionCount = 0;
  var subscriptionHolder = this.subscriptionHolders[id];
  if (subscriptionHolder) {
    subscriptionHolder.subscriptions.forEach(function(subscription) {
      subscriptionCount++;
      subscription.pathSubscriptions.forEach(function(pathSubscription) {
        pathSubscriptionCount++;
        if (pathSubscription.unsubscribe) {
          try {
            pathSubscription.unsubscribe();
          } catch (ex) {
            console.error(ex);
          }
        }
      })
    });
    delete this.subscriptionHolders[id];
  }
  debug("Removed " + subscriptionCount + " context subcriptions with " + pathSubscriptionCount + " paths");
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