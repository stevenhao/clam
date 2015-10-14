window.onload = function() {
  var socket = io();
  console.log('index.js is alive.');
  socket.emit('chat message', 'WHAT IS UP');

  render = function() {

  }

  $('.view').html('Hi');
};