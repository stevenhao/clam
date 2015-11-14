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

  // Login Javascript
  $('#login-view').submit(function() {
    var username = $('#username').val();
    if (username == '')
      return false;
    socket.emit('login', username);
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
  })
  
  // Lobby Javascript
  $('#create-game').click(function(){
    socket.emit('create', {
      'num_players': 4,
      'num_colors': 2,
      'num_ranks': 12,
    });
    return false;
  })

  // Wait Listeners
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
      print(_gameInfo);
      if(myView != 'game' || myGid != _gameInfo['gid']) {
        updateGame(_gameInfo);
      }
    });
  }

  // Game Javascript
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

renderGame = function(_gameInfo) {
  gameInfo = _gameInfo

  console.log('rendering, myPid = ', myPid);
  fillHand = function(hand, cards, pid) {
    orientation = hand.hasClass('vertical') ? 'vertical' : 'horizontal';
    hand.html('');
    addCard = function(cardEl) {
      cardEl.addClass(orientation);
      if (orientation == 'vertical') {
        row.append($('<td>').append(cardEl));
      } else {
        hand.append($('<tr>').append($('<td>').append(cardEl)));
      }
    }
    var row = $('<tr>');

    for(var _idx = 0; _idx < cards.length; ++_idx) {
      var idx = _idx;
      if (hand.hasClass('top') || hand.hasClass('right')) {
        idx = cards.length - idx - 1;
      }
      var card = cards[idx];
      var color = card.color;
      var rank = card.rank;

      var cardEl = $('<div>');
      if (rank) {
        cardEl.append($('<div class="value certain">').append(rank));
      }
      else {
        cardEl.append($('<div class="value uncertain">').append("?"));
      }
      if (card.flipped) {
        cardEl.addClass('flipped');
      }
      cardEl.addClass('card');
      var col = color == 1 ? 'black' : 'red';
      cardEl.addClass(col);
      cardEl.attr('id', pid + '' + idx);
      cardEl.click(function(p, i) {
        return function() {
          selectCard({'idx': i, 'pid': p});
        }
      }(pid, idx));
      addCard(cardEl);
    }

    if (orientation == 'vertical') {
      hand.append(row);
    }

    setName = function(nametag, name, pid) {
      nametag.html(name);
    }
  }

  // until david implements this
  gameInfo.public.names = gameInfo.players;

  turn = gameInfo.public.turn;
  handEls = [$('.hand.bottom'), $('.hand.left'), $('.hand.top'), $('.hand.right')];
  nameEls = [$('.name.bottom'), $('.name.left'), $('.name.top'), $('.name.right')];
  for(var idx = 0; idx < 4; ++idx) {
    oth = (myPid + idx) % 4;
    fillHand(handEls[idx], gameInfo.private[oth], oth);
    setName(nameEls[idx], gameInfo.public.names[oth], oth);
    if (turn == (myPid + idx) % 4) {
      nameEls[idx].addClass('highlighted');
    } else {
      nameEls[idx].removeClass('highlighted');
    }
  }

  $('#status').html(gameInfo.public.names[turn] + ' to play<br>'
    + gameInfo.public.names[getNextAction()] + ' to ' + gameInfo.public.phase);
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
