window.onload = function() {
  var socket = io();
  console.log('tester.js is alive.');
  socket.emit('chat message', 'WHAT IS UP');

  sendMessage = function(ev, msg) {
    socket.emit(ev, msg);
    $('#messages').append($('<li>').text('sent[' + ev + ']: ' + JSON.stringify(msg)));
    console.log('sent message', msg);  
  }

  receiveMessage = function(ev, msg) {
    $('#messages').append($('<li>').text('received[' + ev + ']: ' + JSON.stringify(msg)));
    console.log('received response', msg);
  }

  $('.view').html('Hi');
  $('form').submit(function(){
    ev = $('#event').val();
    value = $('#value').val();
    // console.log(value);
    try {
      value = value.replace(/'/g, '"');
      value = jQuery.parseJSON(value);
    } catch (e) {
        console.log('exception,' + e);
        console.log('submitting as raw string');
    }
    sendMessage(ev, value);
    return false;
  });

  console.log('done');

  var listenTo = ['chat response', 'cat response', 'other events'];
  makeHandler = function(event) {
    return function(data) {
      receiveMessage(event, data);
    }
  }
  for (var e of listenTo) {
    console.log('listening to events: '+ e);
    socket.on(e, makeHandler(e));
  }
};

