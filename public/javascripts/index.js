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
    renderLobby(lobby_data['games'], lobby_data['openGames']);

    // Resets form data
    $('#username').val('');
    $('#password').val('');
    $('#new-password').val('');
    $('#new-confirm-password').val('');
    $('#new-username').val('');
    $('#register-error').css({'display':'none'});
    $('#user-auth').removeClass('has-error');

    $('#login-view-nav').css({'display':'none'});
    $('#login-view').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
    $('#lobby-view-nav').css({'display':'block'});
  });

  socket.on('login denied', function(message){
    $('#user-auth').addClass('has-error');
    $('#password').val('');
    console.log('Login Denied');
  });

  socket.on('user_register denied', function(message){
    $('#register-error').html(message);
    $('#register-error').css({'display':'block'});
    $('#new-password').val('');
    $('#new-confirm-password').val('');
    $('#new-username').val('');
  });

  socket.on('user_register success', function(user_info){
    socket.emit('login', user_info);
  })

  socket.on('logout success', function(){
    if(myView =='login')
      return;
    
    myGid = null;
    myPid = null;
    myUsername = null;

    $('#'+myView+'-view').css({'display':'none'});
    $('#'+myView+'-view-nav').css({'display':'none'});

    myView = 'login';
    $('#login-view-nav').css({'display':'block'});
    $('#login-view').css({'display':'block'});  
  });

  // Login Javascript
  $('#login-submit').click(function() {
    var username = $('#username').val();
    var password = $('#password').val();
    if (username == '')
      return false;

    socket.emit('login', {'username':username, 'password':password});
    return false;
  });

  $('#register').click(function(){
    var username = $('#new-username').val();
    var password = $('#new-password').val();
    var confirm_password = $('#new-confirm-password').val();
    $('#register-error').css({'display':'none'});

    if(password != confirm_password){
      $('#register-error').html('Passwords do not match.');
      $('#register-error').css({'display':'block'});
      $('#new-password').val('');
      $('#new-confirm-password').val('');
      return false;
    }

    if(username == '')
      return false;

    socket.emit('user_register', {'username':username, 'password':password});
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
    $('#'+myView+'-view-nav').css({'display':'none'});
    $('#game-view').css({'display':'block'});
    $('#game-view-nav').css({'display':'block'});

    myView = 'game';
  });

  socket.on('join success', function(joinInfo){
    if(myView != 'lobby')
      return;

    myGid = joinInfo['gid'];
    renderWait(joinInfo);

    $('#lobby-view').css({'display':'none'});
    $('#lobby-view-nav').css({'display':'none'});
    $('#wait-view').css({'display':'block'});
    $('#wait-view-nav').css({'display':'block'});
    console.log('hey');
    myView = 'wait';
  });

  socket.on('create success', function(gid) {
    socket.emit('join', gid);
  });

  socket.on('updateGameList', function(gameList){
    if(myView != 'lobby')
      return;
    updateLobby(gameList['games'], gameList['openGames']);
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
    
    renderLobby(lobby_data['games'], lobby_data['openGames']);
    myGid = null;
    myView = 'lobby';

    $('#wait-view').css({'display':'none'});
    $('#wait-view-nav').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
    $('#lobby-view-nav').css({'display':'block'});
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
  for(game_event of ['pass success', 'guess success', 'flip success', 'clam success']) {
    socket.on(game_event, function(_gameInfo) {
      gameInfo = _gameInfo;
      if(myView == 'game') {
        updateGame();
      }
      deselect();
    });
  }

  socket.on('game_back success', function(lobby_data){
    if(myView != 'game')
      return;
    
    renderLobby(lobby_data['games'], lobby_data['openGames']);
    myGid = null;
    myPid = null;
    myView = 'lobby';
    
    $('#game-view').css({'display':'none'});
    $('#game-view-nav').css({'display':'none'});
    $('#lobby-view').css({'display':'block'});
    $('#lobby-view-nav').css({'display':'block'});
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
  $('#active-games').html('');
  $('#open-games').html('');
  $('#my-games').html('');
  for(gameId in games) {
    var game = games[gameId];
    var tr = $('<tr>').addClass('clickable').addClass('game-cell').attr('gid', gameId);
    var gidCell = $('<td>').append(gameId);
    var hostCell = $('<td>').append(game.host);
    var joined = game.usernames.indexOf(myUsername) != -1 || myUsername == game.host;
    var joinedCell = $('<td>').append(joined ? 'Yes': 'No');
    $('#active-games').append(tr.append(gidCell).append(hostCell).append(joinedCell));
    if(joined){
      tr = $('<tr>').addClass('clickable').addClass('game-cell').attr('gid', gameId);
      gidCell = $('<td>').append(gameId);
      hostCell = $('<td>').append(game.host);
      statusCell = $('<td>').append('Active');
      $('#my-games').append(tr.append(gidCell).append(hostCell).append(statusCell));
    }
  }

  for(gameId in open_games) {
    var game = open_games[gameId];
    var tr = $('<tr>').addClass('clickable').addClass('open-game-cell').attr('gid', gameId);
    var gidCell = $('<td>').append(gameId);
    var hostCell = $('<td>').append(game.host);
    var joined = game.usernames.indexOf(myUsername) != -1 || myUsername == game.host;
    var joinedCell = $('<td>').append(joined ? 'Yes': 'No');
    $('#open-games').append(tr.append(gidCell).append(hostCell).append(joinedCell));
    if(joined){
      tr = $('<tr>').addClass('clickable').addClass('open-game-cell').attr('gid', gameId);
      gidCell = $('<td>').append(gameId);
      hostCell = $('<td>').append(game.host);
      statusCell = $('<td>').append('Open');
      $('#my-games').append(tr.append(gidCell).append(hostCell).append(statusCell));
    }
  }

  $('.game-cell').click(function(){
    var gameId = $(this).attr('gid');
    socket.emit('register', gameId);
  });

  $('.open-game-cell').click(function(){
    var gameId = $(this).attr('gid');
    socket.emit('join', gameId);
  });
  $('#lobby-greeting').html('Welcome, '+myUsername+'!');
}

updateLobby = function(games, open_games) {
  renderLobby(games, open_games);
}

renderWait = function(joinInfo) {
  $('#players-list').html('');
  $('#game-id').html(joinInfo.gid)
  $('#host').html(joinInfo.host);
  for (var i = 0; i < joinInfo.usernames.length; ++i)
    $('#players-list').append('<tr><td class="players-list-cell clickable" id="players-list-cell-'+i+'"> </td></tr>');
  
  $('.players-list-cell').click(function(){
    var id = $(this).attr('id');
    var pid = parseInt(id.substring(id.lastIndexOf('-')+1));
    socket.emit('add_user', pid);
  });

  $('#wait-greeting').html('Welcome, '+myUsername+'!');
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

  createNoteEl = function() {
    var noteEl = $('<textarea>').addClass('notes').html('...');
    noteEl.focus(function() {
      print('handler for focus called');
      if ($(this).html() == '...') {
        $(this).html('');
      }
    });
    noteEl.blur(function() {
      print('handler for blur called');
      if ($(this).html() == '') {
        $(this).html('...');
      }
    });
    return noteEl;
  }

  createCardEl = function() {
    var td = $('<td>').addClass('card').addClass('clickable');
    td.append(createNoteEl());
    return td;
  }

  createHandEl = function(pid) {
    var handEl = $('<tr>');
    var nameEl = createNameEl(name).attr('id', nameId(pid));
    handEl.append(nameEl);

    for (var idx = 0; idx < 6; ++idx) {
      var cardEl = createCardEl().attr('id', cardId(pid, idx)).attr('pid', pid).attr('idx', idx);
      cardEl.dblclick(function(e) {
        print('handler for doubleclick called');
        selectCard($(this));
        return true;
      });

      cardEl.on('taphold', function() {
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
    var button = $('<button>').attr('id', 'clam');
    tr.append($('<td>')).append($('<td>')).append($('<td>'));
    tr.append(td.append(button.append('Clam')));
    button.click(function() {
      actionClam();
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
  var pids = [myPid, (myPid + 2) % 4, (myPid + 1) % 4, (myPid + 3) % 4];
  for (var pid of pids) {
    table.append(createHandEl(pid));
  }

  table.append(createSelectEl());
  table.append(createSubmitEl());
  table.append($('<tr id="filler">'));
  table.append(createClamEl());

  $('#history-text').empty();
  $('#game-greeting').html('Your Game ID is '+myGid+'.');

  updateObjects();
}

updateObjects = function() {
  updateCardEl = function(cardEl) {
    var cardInfo;
    var phase = gameInfo.public.phase;
    if (phase == 'over') {
      cardInfo = gameInfo.true_cards[pid][idx];
    } else {
      cardInfo = gameInfo.private[pid][idx];
    }
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
        if (phase == 'pass') {
          submit.html('Pass');
        } else {
          submit.html('Flip');
        }
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

deselect = function() {
  if (selectedCard != null) {
    selectedCard.removeClass('selected');
    selectedCard = null;
  }
}

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
    deselect();
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

actionClam = function() {
  var ok = true;
  var guessObj = [];
  for (var pid = 0; pid < 4; ++pid) {
    var curList = [];
    for (var idx = 0; idx < 6; ++idx) {
      var cardEl = $('#' + cardId(pid, idx));
      var guess = 0;
      if (cardEl.hasClass('known')) {
        guess = parseInt(cardEl.html());        
      } else {
        var notesEl = $('textarea', cardEl);
        guess = parseInt(notesEl.html());
      }
      if (isNaN(guess)) {
        ok = false;
      }
      curList.push(guess);
    }
    guessObj.push(curList);
  }
  print('clam', guessObj);
  if (!ok) {
    print("clam is not ok.");
  } else {
    print("sending to server.");
    socket.emit('clam', guessObj);
  }
}

