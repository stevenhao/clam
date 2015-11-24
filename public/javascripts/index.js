myPid = null;
myGid = null;
myView = 'login';
selectedCard = null;
myUsername = null;
print = console.log.bind(console);
messageCounter = 0;

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
    socket.emit('add_user', 0);
    socket.emit('start');
  });

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
    gameInfo = _gameInfo;
    if(myView != 'lobby' && !(myView == 'wait' && gameInfo['gid'] == myGid))
      return;

    console.log('register success,', gameInfo);
    myGid = gameInfo['gid'];
    myPid = gameInfo['pid'];
    messageCounter = 0;
    renderGame();
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
        console.log('yo');
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
      gameInfo = _gameInfo;
      if(myView == 'game') {
        updateGame();
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

  $('#game-back').click(function(){
    if(myView != 'game')
      return;

    socket.emit('game_back');
    return false;
  });
  
  // updateGameList();
};

partner = function(x) {
  return (x + 2) % 4;
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
    var gameId = $(this).html();
    socket.emit('register', gameId);
  });

  $('.open-game-cell').click(function(){
    var gameId = $(this).html();

    socket.emit('join', gameId);
  });
}

updateLobby = function(games, open_games) {
  renderLobby(games, open_games);
}

renderWait = function(joinInfo) {
  $('#players-list').html('');
  $('#game-id').html('Game Id: '+joinInfo.gid)
  $('#host').html('Host: ' + joinInfo.host);
  for (var i = 0; i < joinInfo.usernames.length; ++i)
    $('#players-list').append('<tr><td class="players-list-cell" id="players-list-cell-'+i+'"> </td></tr>');
  
  $('.players-list-cell').click(function(){
    var id = $(this).attr('id');
    var pid = parseInt(id.substring(id.lastIndexOf('-')+1));
    socket.emit('add_user', pid);
  });

  updateWait(joinInfo);
}

updateWait = function(joinInfo){
  var filled = true;
  for (var i = 0; i < joinInfo.usernames.length; ++i) {
    if (joinInfo.usernames[i] == null){
      $('#players-list-cell-'+i).html('Join as Player '+(i+1));
      filled = false;
    } else{
      $('#players-list-cell-'+i).html(joinInfo.usernames[i]);
    }
  }

  if (myUsername == joinInfo.host && filled)
    $('#start-game').css({'display':'block'});
  else
    $('#start-game').css({'display':'none'});
}

cardId = function(pid, idx) {
  return 'card-' + pid + '-' + idx;
}

nameId = function(pid) {
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
    var nameEl = createNameEl(name).attr('id', nameId(pid));
    handEl.append(nameEl);

    for (var idx = 0; idx < 6; ++idx) {
      var cardEl = createCardEl().attr('id', cardId(pid, idx)).attr('pid', pid).attr('idx', idx);
      cardEl.click(function() {
        selectCard($(this));
      });
      handEl.append(cardEl);
    }
    return handEl;
  }

  createSelectEl = function() {
    var tr = $('<tr>').attr('id', 'select');
    tr.append($('<td>'));
    for (var i = 1; i <= 12; i += 2) {
      var td = $('<td>');
      tr.append(td);
      for (var j = i; j <= i + 1; ++j) {
        var div = $('<div>').addClass('num');
        if (j % 2 == 1) {
          div.addClass('left-num');
        } else {
          div.addClass('right-num');
        }
        td.append(div.append($('<span>').append(j)));

        div.attr('value', j);
        div.click(function() {
          // print('clicked', $(this).attr('value'));
          actionGuess($(this).attr('value'));
        });
      }
    }
    return tr;
  }

  createSubmitEl = function() {
    var tr = $('<tr>');
    var td = $('<td>').attr('colspan', '2');
    var button = $('<button>').attr('id', 'submit');
    tr.append($('<td>')).append($('<td>')).append($('<td>'));
    tr.append(td.append(button.append('Submit')));
    button.click(function() {
      var phase = gameInfo.public.phase;
      print('submit was clicked, phase=', phase);
      if (phase == 'pass') {
        actionPass();
      } else if (phase == 'flip') {
        actionFlip();
      }
    });
    return tr;
  }

  createClamEl = function() {
    var tr = $('<tr>');
    var td = $('<td>').attr('colspan', '2');
    var button = $('<button>').attr('id', 'claim');
    tr.append($('<td>')).append($('<td>')).append($('<td>'));
    tr.append(td.append(button.append('Claim')));
    button.click(function() {
      print('clam was clicked.');
    });
    return tr;
  }

  createStatusEl = function() {
    var tr = $('<tr>');
    var td = $('<td>');
    var span = $('<span>');
    td.attr('colspan', '6').css('text-align:center');
    span.attr('id', 'status').css('font-size:30px;font-weight:bold');
    span.append("It's your turn to pass!");
    tr.append($('<td>')).append(td.append(span));
    return tr;
  }

  var table = $('#game-layout');
  table.empty();

  table.append(createStatusEl());
  var pid = myPid;
  do {
    table.append(createHandEl(pid));
    pid = (pid + 1) % 4;
  } while (pid != myPid);

  table.append(createSelectEl());
  table.append(createSubmitEl());
  table.append($('<tr id="filler">'));
  table.append(createClamEl());

  $('#history-text').empty();

  updateObjects();
}

updateObjects = function() {
  updateCardEl = function(cardEl) {
    var cardInfo = gameInfo.private[pid][idx];

    // fill card backs
    if (cardInfo.color == 1) {
      cardEl.addClass('red');
      cardEl.removeClass('black');
    } else { // color == 2
      cardEl.addClass('black');
      cardEl.removeClass('red');
    }

    // fill card ranks
    var rank = cardInfo.rank;
    if (rank != 0) {
      cardEl.addClass('known');
      cardEl.removeClass('unknown');
      cardEl.html(rank);
    } else {
      cardEl.removeClass('known');
      cardEl.addClass('unknown');
      if (cardEl.html().length == 0) {
        cardEl.html('?');
      }
    }

    // set card flipped
    if (cardInfo.flipped) {
      cardEl.addClass('flipped');
    } else {
      cardEl.removeClass('flipped');
    }
  }

  updateStatusEl = function(el) {
    var turn = parseInt(gameInfo.public.turn);
    var phase = gameInfo.public.phase;
    var names = gameInfo.players;

    createStatusMessage = function() {
      if (phase == 'pass') {
        var pid = partner(turn);
        return names[pid] + ' to pass';
      } else if (phase == 'guess') {
        var pid = turn;
        return names[pid] + ' to guess';
      } else if (phase == 'flip') {
        var pid = turn;
        return names[pid] + ' to flip';
      } else if (phase == 'over') {
        // TODO: check who won, etc.
        return 'Game over';
      }
    }

    el.html(createStatusMessage());
  }

  updateHistoryEl = function(el) {
    var history = gameInfo.public.history;
    while (messageCounter < history.length) {
      el.append(history[messageCounter].message).append($('<br>'));
      ++messageCounter;
    }
  }

  updateButtonVisibility = function(select, submit, filler) {
    for (var el of [select, submit, filler]) {
      el.attr('hidden', '1');
    }

    var turn = parseInt(gameInfo.public.turn);
    var phase = gameInfo.public.phase;
    var pid = turn;
    if (phase == 'pass') {
      pid = partner(turn);
    }

    print ('updating button visibility', pid, phase);
    if (pid == myPid) {
      if (phase == 'pass' || phase == 'flip') {
        submit.removeAttr('hidden');
      } else if (phase == 'guess') {
        select.removeAttr('hidden');
      }
    } else {
      filler.removeAttr('hidden');
    }
  }

  for (var pid = 0; pid < 4; ++pid) {
    // fill names
    var nameEl = $('#' + nameId(pid));    
    var name = gameInfo.players[pid];
    nameEl.html(name);

    for(var idx = 0; idx < 6; ++idx) {
      var cardEl = $('#' + cardId(pid, idx));
      updateCardEl(cardEl);
    }
  }

  updateStatusEl($('#status'));
  updateHistoryEl($('#history-text'));
  updateButtonVisibility($('#select'), $('#submit'), $('#filler'));
}

updateGame = function() {
  updateObjects();
}

selectCard = function(card) {
  console.log('select card', card);
  if (card.hasClass('selected')) {
    card.removeClass('selected');
    selectedCard = null;
  } else {
    if (selectedCard) {
      selectedCard.removeClass('selected');
    }

    card.addClass('selected');
    selectedCard = card;
  }
}



  // $('#goform').submit(function() {
  //   // pass, guess, flip
  //   try {
  //   if (selectedCard == null) {
  //     print('WHAT CARD DUDE');
  //     return false;
  //   }

  //   if (myPid != getNextAction()) {
  //     print('NOT YOUR TURN BRO!');
  //     return false;
  //   }

  //   var phase = gameInfo.public.phase;
  //   if (phase == 'pass') {
  //     if (selectedCard.pid != myPid) {
  //       print('PASS YOUR CARD DUDE');
  //       return false;
  //     }
  //     socket.emit('pass', {'card': selectedCard.idx});
  //   } else if (phase == 'guess') {
  //     var rank = $('#guess').val();
  //     var guessObj = {'target_id': selectedCard.pid, 'target_card': selectedCard.idx, 'rank': rank};
  //     socket.emit('guess', guessObj);
  //   } else if (phase == 'flip') {
  //     if (selectedCard.pid != myPid) {
  //       print('FLIP YOUR CARD DUDE');
  //       return false;
  //     }
  //     socket.emit('flip', {'card': selectedCard.idx});
  //   }
  // }
  //   catch(e) {
  //     print('exception', e);
  //   }

  //   return false;
  // });

actionGuess = function(rank) {
  if (selectedCard != null) {
    var pid = parseInt(selectedCard.attr('pid'));
    var idx = parseInt(selectedCard.attr('idx'));
    if (pid != myPid && pid != partner(myPid)) {
      var guessObj = {'target_id': pid, 'target_card': idx, 'rank': rank};
      socket.emit('guess', guessObj);
      print('Guessing,', guessObj);
    }
  }
}

actionPass = function() {
  if (selectedCard != null) {
    var pid = parseInt(selectedCard.attr('pid'));
    var idx = parseInt(selectedCard.attr('idx'));
    if (pid == myPid) {
      var passObj = {'card': idx};
      socket.emit('pass', passObj);
      print('Passing,', passObj);
    }
  }
}

actionFlip = function() {
  if (selectedCard != null) {
    var pid = parseInt(selectedCard.attr('pid'));
    var idx = parseInt(selectedCard.attr('idx'));
    if (pid == myPid) {
      var flipObj = {'card': idx};
      socket.emit('flip', flipObj);
      print('Flipping,', flipObj);
    }
  }
}

