/*!
 * IE10 viewport hack for Surface/desktop Windows 8 bug
 * Copyright 2014-2015 Twitter, Inc.
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 */

// See the Getting Started docs for more information:
// http://getbootstrap.com/getting-started/#support-ie10-width

(function () {
  'use strict';

  if (navigator.userAgent.match(/IEMobile\/10\.0/)) {
    var msViewportStyle = document.createElement('style')
    msViewportStyle.appendChild(
      document.createTextNode(
        '@-ms-viewport{width:auto!important}'
      )
    )
    document.querySelector('head').appendChild(msViewportStyle)
  }
})();

$(function() {
  $('#genUUID').click(function(e) {
    e.preventDefault();

    $.get('/admin/uuid', function(data) {
      var uuid = data.uuid;
      console.log(uuid);
      $('#uuid_0').val(uuid[0]);
      $('#uuid_1').val(uuid[1]);
      $('#uuid_2').val(uuid[2]);
      $('#uuid_3').val(uuid[3]);
      $('#uuid_4').val(uuid[4]);
    });
  });
});
