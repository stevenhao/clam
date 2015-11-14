myPid = 0;
myGid = 0;
selectedCard = null

window.onload = function() {
  socket = io();
  console.log('index.js is alive.');
  socket.on('register success', function(_gameInfo) {
    console.log('register success,', _gameInfo);
    gameInfo = _gameInfo;
    render();
  });


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
      socket.emit('create', {'num_players': 4, 'num_ranks': 12, 'num_colors': 2});
    } else {
      print('playing as pid, gid:', myPid, myGid);
      updateGame();
    }
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
    updateGame();
  }
    catch(e) {
      print('exception', e);
    }

    updateGame();
    return false;
  });
  socket.on('gameIDs', function(list) {
    renderGameList(list);
  });
  updateGameList();
};

function updateGameList() {
  print('updating game list');
  socket.emit('gameIDs');

}

function updateGame() {  
  print('updating game');
  socket.emit('register', myPid, myGid);
}

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
// public_info is a thing

print = console.log.bind(console);

render = function() {
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
  gameInfo.public.names = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

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
