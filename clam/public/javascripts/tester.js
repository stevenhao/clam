window.onload = function() {
  var socket = io();
  console.log('tester.js is alive.');
  socket.emit('chat message', 'WHAT IS UP');

  $('.view').html('Hi');
  $('form').submit(function(){
    ev = $('#event').val();
    value = $('#value').val();
    // console.log(value);
    try {
      value = value.replace(/'/g, '"');
      value = jQuery.parseJSON(value);
      console.log('parsing success');
      console.log(value);
    } catch (e) {
        console.log('exception: ' + e);
        console.log('submitting as raw string');
    }
    socket.emit(ev, value);
    $('#value').val('');
    console.log('submitted ' + value);
    return false;
  });
  console.log('done');
};