myGid = 0;
window.onload = function() {
  socket = io();
  console.log('tester.js is alive.');

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
  $('#sendform').submit(function(){
    ev = $('#event').val();
    value = $('#value').val();
    // console.log(value);
    try {
      value = value.replace(/'/g, '"');
      value = jQuery.parseJSON(value);
    } catch (e) {
        console.log('exception', e);
        console.log('submitting as raw string');
    }
    sendMessage(ev, value);
    return false;
  });

  console.log('done');

  var listenTo = ['connection', 'register error',
   'register success', 'chat response', 'pid error', 'pid success', 
   'guess error', 'guess success', 'flip error', 'flip success', 
   'pass error', 'pass success', 'create success', 'gameIDs'];
  makeHandler = function(event) {
    return function(data) {
      receiveMessage(event, data);
    }
  }
  for (var e of listenTo) {
    console.log('listening to events: '+ e);
    socket.on(e, makeHandler(e));
  }

  print = console.log.bind(console);

  $('#register').submit(function() {
    myPid = parseInt($('input[name=pid]:checked').val());
    myGid = $('input[name=gid]:checked').val();
    if (myGid == 'New') {
      print('creating game');
      socket.on('create success', function(gid) {
        myGid = gid;
        updateGameList();
        updateGame();
      });
      sendMessage('create', {'num_players': 4, 'num_ranks': 12, 'num_colors': 2});
    } else {
      print('playing as pid, gid:', myPid, myGid);
      updateGame();
    }
    return false;
  });

  socket.on('gameIDs', function(list) {
    renderGameList(list);
  });
  updateGameList();
};

function updateGame() {  
  print('updating game');
  socket.emit('register', myPid, myGid);
  $('#messages').append($('<li>').text('sent[register]: ' + myPid + ',' + myGid));
  console.log('sent message register', myPid, myGid);  

}


function updateGameList() {
  print('updating game list');
  sendMessage('gameIDs',{});

}

renderGameList = function(list) {
  print('rendering game list', list);
  var gidform = $('#gidform');
  gidform.html('');
  list.push('New');
  for (var i = 0; i < list.length; ++i) {
    gid = list[i];
    var el = $('<input type="radio" name="gid" />');
    el.attr('value', gid);
    if (gid == myGid) {
      el.attr('checked', 'checked');
    }
    gidform.append(el);
    gidform.append(gid);
  }
}