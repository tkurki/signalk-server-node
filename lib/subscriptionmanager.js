var debug = require('debug')('signalk:subscriptionmanager');
var _ = require('lodash');

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
          if (delta.context === subscription.context) {
            delta.updates[0].values.forEach(function(pathValue) {
              subscription.pathSubscriptions.forEach(function(subsPathValue) {
                if (pathValue.path === subsPathValue.path) {
                  subscription.callback(delta);
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
      pathSubscriptions: command.subscribe,
      callback: callback
    });
  }
  debug("holders:" + JSON.stringify(this.subscriptionHolders))
}

module.exports = SubscriptionManager;