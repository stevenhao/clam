myPid = null;
myGid = null;
myView = 'login';
selectedCard = null;
myUsername = null;

window.onload = function() {
  socket = io();
  console.log('index.js is alive.');

  // Login Listeners
  socket.on('login success', function(lobby_data) {
    if(myView != 'login')
      return;

    myView = 'lobby';
    myUsername = lobby_data['username'];
    renderLobby(lobby_data['gameIds'], lobby_data['openGameIds']);

    $('#login-view').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
  });

  socket.on('logout success', function(){
    if(myView =='login')
      return;
    
    myGid = null;
    myPid = null;
    myUsername = null;

    $('#'+myView+'-view').css({'display':'none'});

    myView = 'login';
    $('#login-view').css({'display':'block'});  
  });

  $('#fast-forward').click(function() {
    var a = 'a', b = 'b', c = 'c', d = 'd';
    socket.emit('login', a);
    socket.emit('create', {
      'num_players': 4,
      'num_colors': 2,
      'num_ranks': 12,
    });

    socket.emit('add_user', 0);
    socket.emit('logout');

    socket.emit('login', b);
    socket.emit('join', 1);
    socket.emit('add_user', 1);
    socket.emit('logout');

    socket.emit('login', c);
    socket.emit('join', 1);
    socket.emit('add_user', 2);
    socket.emit('logout');

    socket.emit('login', d);
    socket.emit('join', 1);
    socket.emit('add_user', 3);
    socket.emit('logout');

    socket.emit('login', a);
    socket.emit('join', 1);
  })
  // Login Javascript
  $('#login-view').submit(function() {
    var username = $('#username').val();
    if (username == '')
      return false;
    socket.emit('login', username);
    return false;
  });

  $('.logout').click(function(){
    if(myView == 'login')
      return false;

    socket.emit('logout');
    return false;
  });

  // Lobby Listeners
  socket.on('register success', function(_gameInfo) {
    if(myView != 'lobby' && !(myView == 'wait' && _gameInfo['gid'] == myGid))
      return;

    console.log('register success,', _gameInfo);

    myGid = _gameInfo['gid'];
    myPid = _gameInfo['pid'];
    renderGame(_gameInfo);
    $('#'+myView+'-view').css({'display':'none'});
    $('#game-view').css({'display':'block'});

    myView = 'game';
  });

  socket.on('join success', function(joinInfo){
    if(myView != 'lobby')
      return;

    myGid = joinInfo['gid'];
    renderWait(joinInfo);

    $('#lobby-view').css({'display':'none'});
    $('#wait-view').css({'display':'block'});
    myView = 'wait';
  });

  socket.on('create success', function(gid) {
    socket.emit('join', gid);
  });

  socket.on('updateGameList', function(gameList){
    if(myView != 'lobby')
      return;
    updateLobby(gameList['gameIds'], gameList['openGameIds']);
  });
  
  // Lobby Javascript
  $('#create-game').click(function(){
    if (myView != 'lobby')
      return;
    socket.emit('create', {
      'num_players': 4,
      'num_colors': 2,
      'num_ranks': 12,
    });
    return false;
  });

  $('#wait-back').click(function(){
    if(myView != 'wait')
      return;

    socket.emit('wait_back');
    return false;
  });

  // Wait Listeners
  socket.on('wait_back success', function(lobby_data){
    if(myView != 'wait')
      return;
    
    renderLobby(lobby_data['gameIds'], lobby_data['openGameIds']);
    myGid = null;
    myView = 'lobby';

    $('#wait-view').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
  });

  socket.on('wait update', function(waitInfo){
    if (myView != 'wait' || myGid != waitInfo['gid']) {
      return;
    }
    updateWait(waitInfo);
  });

  socket.on('start', function(startInfo){
    if (myView == 'wait' && myGid == startInfo['gid']) {
      if(startInfo['usernames'].indexOf(myUsername) != -1) {
        socket.emit('register', startInfo['gid']);
      }
    }
  });

  // Wait Javascript
  $('#start-game').click(function(){
    socket.emit('start');
  })

  // Game Listeners
  for(game_event of ['pass success', 'guess success', 'flip success']) {
    socket.on(game_event, function(_gameInfo) {
      if(myView != 'game' || myGid != _gameInfo['gid']) {
        updateGame(_gameInfo);
      }
    });
  }

  socket.on('game_back success', function(lobby_data){
    if(myView != 'game')
      return;
    
    renderLobby(lobby_data['gameIds'], lobby_data['openGameIds']);
    myGid = null;
    myPid = null;
    myView = 'lobby';
    
    $('#game-view').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
  });

  // Game Javascript
  $('#game-back').click(function(){
    if(myView != 'game')
      return;

    socket.emit('game_back');
    return false;
  });

  $('#goform').submit(function() {
    // pass, guess, flip
    try {
    if (selectedCard == null) {
      print('WHAT CARD DUDE');
      return false;
    }

    if (myPid != getNextAction()) {
      print('NOT YOUR TURN BRO!');
      return false;
    }

    var phase = gameInfo.public.phase;
    if (phase == 'pass') {
      if (selectedCard.pid != myPid) {
        print('PASS YOUR CARD DUDE');
        return false;
      }
      socket.emit('pass', {'card': selectedCard.idx});
    } else if (phase == 'guess') {
      var rank = $('#guess').val();
      var guessObj = {'target_id': selectedCard.pid, 'target_card': selectedCard.idx, 'rank': rank};
      socket.emit('guess', guessObj);
    } else if (phase == 'flip') {
      if (selectedCard.pid != myPid) {
        print('FLIP YOUR CARD DUDE');
        return false;
      }
      socket.emit('flip', {'card': selectedCard.idx});
    }
  }
    catch(e) {
      print('exception', e);
    }

    return false;
  });
  
  // updateGameList();
};

function partner(x) {
  return (x + 2) % 4;
}

function getNextAction() {
  try {
  print('getting next action.');
  var turn = gameInfo.public.turn;
  var phase = gameInfo.public.phase;
  if (phase == 'pass') {
    return partner(turn);
  } else if (phase == 'guess') {
    return turn;
  } else if (phase == 'flip') {
    return turn;
  }}
  catch(e){
    print('exception', e);
  }
}

renderLobby = function(games, open_games) {
  $('#game-ids').html('');
  $('#open-game-ids').html('');
  for(game of games) {
    $('#game-ids').append('<tr><td class="game-cell">'+game+'</td></tr>');
  }

  for(game of open_games) {
    $('#open-game-ids').append('<tr><td class="open-game-cell">'+game+'</td></tr>');
  }

  $('.game-cell').click(function(){
    var gameId = parseInt($(this).html());
    socket.emit('register', gameId);
  });

  $('.open-game-cell').click(function(){
    var gameId = parseInt($(this).html());
    socket.emit('join', gameId);
  });
}

updateLobby = function(games, open_games) {
  renderLobby(games, open_games);
}

renderWait = function(gameInfo) {
  $('#players-list').html('');
  $('#game-id').html('Game Id: '+gameInfo['gid'])
  $('#host').html('Host: ' + gameInfo['host']);
  for (var i = 0; i < gameInfo['usernames'].length; ++i)
    $('#players-list').append('<tr><td class="players-list-cell" id="players-list-cell-'+i+'"> </td></tr>');
  
  $('.players-list-cell').click(function(){
    var id = $(this).attr('id');
    var pid = parseInt(id.substring(id.lastIndexOf('-')+1));
    socket.emit('add_user', pid);
  });

  updateWait(gameInfo);
}

updateWait = function(gameInfo){
  var filled = true;
  for (var i = 0; i < gameInfo['usernames'].length; ++i) {
    if (gameInfo['usernames'][i] == null){
      $('#players-list-cell-'+i).html('Join as Player '+(i+1));
      filled = false;
    } else{
      $('#players-list-cell-'+i).html(gameInfo['usernames'][i]);
    }
  }

  if (myUsername == gameInfo['host'] && filled)
    $('#start-game').css({'display':'block'});
  else
    $('#start-game').css({'display':'none'});
}

cardId = function(pid, idx) {
  return 'card-' + pid + '-' + idx;
}

nameTagId = function(pid) {
  return 'nameTag-' + pid;
}

renderGame = function() {
  createNameEl = function() {
    var td = $('<td>').addClass('player-name');
    return td;
  }

  createCardEl = function() {
    var td = $('<td>').addClass('card');
    return td;
  }

  createHandEl = function(pid) {
    var handEl = $('<tr>');
    var nameEl = createNameEl(name);
    handEl.append(nameEl);
    nameEl.attr('id', nameTagId(pid));

    for (var idx = 0; idx < 6; ++idx) {
      var cardEl = createCardEl();
      cardEl.attr('id', cardId(pid, idx));
      handEl.append(cardEl);
    }
    return handEl;
  }

  createSelectEl = function() {
    var tr = $('<tr>').attr('id', 'num-select');
    tr.append($('<td>'));
    for (var i = 1; i <= 12; i += 2) {
      var td = $('<td>');
      tr.append(td);
      for (var j = i; j <= i + 1; ++j) {
        var div = $('<div>').addClass('num');
        td.append(div);
        if (j % 2 == 1) {
          div.addClass('left-num');
        } else {
          div.addClass('right-num');
        }
        div.append($('<span>').append(j));
        div.click((function(num) {
          return function() {
            print('clicked', num);
          }
        })(j));
      }
    }
    return tr;
  }

  createSubmitEl = function() {
    var tr = $('<tr>');
    var td = $('<td>').attr('colspan', '2');
    var button = $('<button>').attr('id', 'submit');
    tr.append($('<td>'));
    tr.append($('<td>'));
    tr.append($('<td>'));
    tr.append(td);
    td.append(button);
    button.append('Submit');
    button.click(function() {
      print('submit was clicked.');
    });
    return tr;
  }

  createClamEl = function() {
    var tr = $('<tr>');
    var td = $('<td>').attr('colspan', '2');
    var button = $('<button>').attr('id', 'claim');
    tr.append($('<td>'));
    tr.append($('<td>'));
    tr.append($('<td>'));
    tr.append(td);
    td.append(button);
    button.append('Claim');
    button.click(function() {
      print('clam was clicked.');
    });
    return tr;
  }

  var table = $('#game-layout');
  var pid = myPid;
  do {
    table.append(createHandEl(pid));
    pid = (pid + 1) % 4;
  } while (pid != myPid);

  table.append(createSelectEl());
  table.append(createSubmitEl());
  table.append($('<tr id="filler">'));
  table.append(createClamEl());

}

updateObjects = function(_gameInfo) {

}

updateGame = function(_gameInfo) {
  renderGame(_gameInfo);
}

selectCard = function(card) {
  console.log('select card', card);
  if (selectedCard) {
    $('#' + selectedCard.pid + '' + selectedCard.idx).removeClass('selected');
  }
  if (selectedCard != null && selectedCard.idx == card.idx && selectedCard.pid ==  card.pid) {
    selectedCard = null;
  } else {
    selectedCard = card;
    var el = $('#' + selectedCard.pid + '' + selectedCard.idx);
    el.addClass('selected');
  }
}

print = console.log.bind(console);
